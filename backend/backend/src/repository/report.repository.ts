import { FilterQuery, Types, UpdateQuery } from "mongoose";
import {
  PurchaseOrderStatus,
  ReportFormat,
  ReportFrequency,
  ReportKind,
  RequestStatus,
  SortOrder,
  StockMovementType,
} from "../constants";
import {
  InventoryBalanceModel,
  ISavedReport,
  PurchaseOrderModel,
  SavedReportModel,
  StockMovementModel,
  StockRequestModel,
} from "./schemas";

export interface ReportRangeFilter {
  warehouseId?: string;
  departmentId?: string;
  itemId?: string;
  categoryId?: string;
  limit?: number;
}

export interface StockStatusFilter extends ReportRangeFilter {
  status?: "in_stock" | "low_stock" | "out_of_stock";
}

export interface SavedReportCreateRecord {
  organizationId: string;
  name: string;
  description?: string;
  kind: ReportKind;
  filters: Record<string, unknown>;
  columns?: string[];
  format?: ReportFormat;
  frequency?: ReportFrequency;
  recipients?: string[];
  nextRunAt?: Date;
  isActive?: boolean;
  createdBy: string;
}

export interface SavedReportListFilter {
  page?: number;
  limit?: number;
  search?: string;
  kind?: ReportKind;
  frequency?: ReportFrequency;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: SortOrder | "asc" | "desc";
}

const toObjectId = (id: string) => new Types.ObjectId(id);

const pageValues = (filter: SavedReportListFilter) => ({
  page: filter.page ?? 1,
  limit: filter.limit ?? 20,
});

const sort = (
  filter: SavedReportListFilter,
  fallback: string,
): Record<string, 1 | -1> => ({
  [filter.sortBy ?? fallback]: filter.sortOrder === SortOrder.ASC ? 1 : -1,
});

const pagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const stockMatch = (organizationId: string, filter: ReportRangeFilter = {}) => {
  const match: Record<string, unknown> = {
    organizationId: toObjectId(organizationId),
    isDeleted: { $ne: true },
  };
  if (filter.warehouseId) match.warehouseId = toObjectId(filter.warehouseId);
  if (filter.itemId) match.itemId = toObjectId(filter.itemId);
  return match;
};

const movementMatch = (
  organizationId: string,
  from: Date,
  to: Date,
  filter: ReportRangeFilter = {},
) => {
  const match: Record<string, unknown> = {
    organizationId: toObjectId(organizationId),
    occurredAt: { $gte: from, $lte: to },
    isDeleted: { $ne: true },
  };
  if (filter.warehouseId) match.warehouseId = toObjectId(filter.warehouseId);
  if (filter.departmentId) {
    match.departmentId = toObjectId(filter.departmentId);
  }
  if (filter.itemId) match.itemId = toObjectId(filter.itemId);
  return match;
};

const stockStatusPipeline = (
  organizationId: string,
  filter: StockStatusFilter = {},
) => [
  { $match: stockMatch(organizationId, filter) },
  {
    $lookup: {
      from: "items",
      localField: "itemId",
      foreignField: "_id",
      as: "item",
    },
  },
  { $unwind: "$item" },
  ...(filter.categoryId
    ? [{ $match: { "item.categoryId": toObjectId(filter.categoryId) } }]
    : []),
  {
    $lookup: {
      from: "warehouses",
      localField: "warehouseId",
      foreignField: "_id",
      as: "warehouse",
    },
  },
  { $unwind: "$warehouse" },
  {
    $addFields: {
      availableQuantity: {
        $ifNull: [
          "$availableQuantity",
          {
            $max: [
              0,
              {
                $subtract: [
                  "$quantity",
                  { $ifNull: ["$reservedQuantity", 0] },
                ],
              },
            ],
          },
        ],
      },
      threshold: {
        $ifNull: ["$minStockThreshold", "$item.minStockThreshold"],
      },
      totalValue: {
        $ifNull: [
          "$totalValue",
          { $multiply: ["$quantity", { $ifNull: ["$averageCost", 0] }] },
        ],
      },
    },
  },
  {
    $addFields: {
      status: {
        $switch: {
          branches: [
            {
              case: { $lte: ["$availableQuantity", 0] },
              then: "out_of_stock",
            },
            {
              case: { $lte: ["$availableQuantity", "$threshold"] },
              then: "low_stock",
            },
          ],
          default: "in_stock",
        },
      },
    },
  },
  ...(filter.status ? [{ $match: { status: filter.status } }] : []),
];

export class ReportRepository {
  stockMovementSummary(
    organizationId: string,
    from: Date,
    to: Date,
    filter: ReportRangeFilter = {},
  ) {
    return StockMovementModel.aggregate([
      { $match: movementMatch(organizationId, from, to, filter) },
      {
        $group: {
          _id: { itemId: "$itemId", type: "$type" },
          quantity: { $sum: "$quantity" },
          totalCost: { $sum: "$totalCost" },
          movements: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "items",
          localField: "_id.itemId",
          foreignField: "_id",
          as: "item",
        },
      },
      { $unwind: "$item" },
      {
        $project: {
          _id: 0,
          itemId: "$_id.itemId",
          type: "$_id.type",
          itemName: "$item.name",
          sku: "$item.sku",
          quantity: 1,
          totalCost: 1,
          movements: 1,
        },
      },
      { $sort: { itemName: 1, type: 1 } },
    ]);
  }

  departmentConsumption(
    organizationId: string,
    from: Date,
    to: Date,
    filter: ReportRangeFilter = {},
  ) {
    return StockMovementModel.aggregate([
      {
        $match: {
          ...movementMatch(organizationId, from, to, filter),
          type: StockMovementType.OUTFLOW,
          departmentId: { $exists: true },
        },
      },
      {
        $group: {
          _id: { departmentId: "$departmentId", itemId: "$itemId" },
          quantity: { $sum: "$quantity" },
          totalCost: { $sum: "$totalCost" },
        },
      },
      {
        $lookup: {
          from: "departments",
          localField: "_id.departmentId",
          foreignField: "_id",
          as: "department",
        },
      },
      {
        $lookup: {
          from: "items",
          localField: "_id.itemId",
          foreignField: "_id",
          as: "item",
        },
      },
      { $unwind: "$department" },
      { $unwind: "$item" },
      {
        $project: {
          _id: 0,
          departmentId: "$_id.departmentId",
          departmentName: "$department.name",
          itemId: "$_id.itemId",
          itemName: "$item.name",
          sku: "$item.sku",
          quantity: 1,
          totalCost: 1,
        },
      },
      { $sort: { departmentName: 1, itemName: 1 } },
    ]);
  }

  stockStatus(organizationId: string, filter: StockStatusFilter = {}) {
    return InventoryBalanceModel.aggregate([
      ...stockStatusPipeline(organizationId, filter),
      {
        $project: {
          _id: 0,
          itemId: 1,
          itemName: "$item.name",
          sku: "$item.sku",
          categoryId: "$item.categoryId",
          warehouseId: 1,
          warehouseName: "$warehouse.name",
          quantity: 1,
          reservedQuantity: 1,
          availableQuantity: 1,
          averageCost: 1,
          totalValue: 1,
          threshold: 1,
          status: 1,
        },
      },
      { $sort: { status: 1, availableQuantity: 1, itemName: 1 } },
    ]);
  }

  lowStock(organizationId: string, filter: ReportRangeFilter = {}) {
    return this.stockStatus(organizationId, { ...filter, status: "low_stock" });
  }

  outOfStock(organizationId: string, filter: ReportRangeFilter = {}) {
    return this.stockStatus(organizationId, {
      ...filter,
      status: "out_of_stock",
    });
  }

  inventoryValuation(organizationId: string, filter: ReportRangeFilter = {}) {
    return InventoryBalanceModel.aggregate([
      ...stockStatusPipeline(organizationId, filter),
      {
        $project: {
          _id: 0,
          itemId: 1,
          itemName: "$item.name",
          sku: "$item.sku",
          categoryId: "$item.categoryId",
          warehouseId: 1,
          warehouseName: "$warehouse.name",
          quantity: 1,
          availableQuantity: 1,
          averageCost: 1,
          totalValue: 1,
        },
      },
      { $sort: { totalValue: -1, itemName: 1 } },
    ]);
  }

  topConsumption(
    organizationId: string,
    from: Date,
    to: Date,
    filter: ReportRangeFilter = {},
  ) {
    return StockMovementModel.aggregate([
      {
        $match: {
          ...movementMatch(organizationId, from, to, filter),
          type: StockMovementType.OUTFLOW,
        },
      },
      {
        $group: {
          _id: { itemId: "$itemId", departmentId: "$departmentId" },
          quantity: { $sum: "$quantity" },
          totalCost: { $sum: "$totalCost" },
          movements: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "items",
          localField: "_id.itemId",
          foreignField: "_id",
          as: "item",
        },
      },
      {
        $lookup: {
          from: "departments",
          localField: "_id.departmentId",
          foreignField: "_id",
          as: "department",
        },
      },
      { $unwind: "$item" },
      { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          itemId: "$_id.itemId",
          itemName: "$item.name",
          sku: "$item.sku",
          departmentId: "$_id.departmentId",
          departmentName: "$department.name",
          quantity: 1,
          totalCost: 1,
          movements: 1,
        },
      },
      { $sort: { quantity: -1, totalCost: -1 } },
      { $limit: filter.limit ?? 10 },
    ]);
  }

  async dashboardSummary(organizationId: string, from: Date, to: Date) {
    const [
      stockHealth,
      movementTotals,
      requestTotals,
      purchaseTotals,
      topConsumption,
    ] = await Promise.all([
      InventoryBalanceModel.aggregate([
        ...stockStatusPipeline(organizationId),
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            quantity: { $sum: "$quantity" },
            totalValue: { $sum: "$totalValue" },
          },
        },
      ]),
      StockMovementModel.aggregate([
        { $match: movementMatch(organizationId, from, to) },
        {
          $group: {
            _id: "$type",
            quantity: { $sum: "$quantity" },
            totalCost: { $sum: "$totalCost" },
            movements: { $sum: 1 },
          },
        },
      ]),
      StockRequestModel.aggregate([
        {
          $match: {
            organizationId: toObjectId(organizationId),
            createdAt: { $gte: from, $lte: to },
            isDeleted: { $ne: true },
          },
        },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      PurchaseOrderModel.aggregate([
        {
          $match: {
            organizationId: toObjectId(organizationId),
            createdAt: { $gte: from, $lte: to },
            isDeleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$totalAmount" },
          },
        },
      ]),
      this.topConsumption(organizationId, from, to, { limit: 5 }),
    ]);

    const stockByStatus = Object.fromEntries(
      stockHealth.map((entry) => [entry._id, entry]),
    );
    const requestsByStatus = Object.fromEntries(
      requestTotals.map((entry) => [entry._id, entry.count]),
    );
    const purchaseOrdersByStatus = Object.fromEntries(
      purchaseTotals.map((entry) => [entry._id, entry]),
    );

    return {
      stock: {
        inStock: stockByStatus.in_stock?.count ?? 0,
        lowStock: stockByStatus.low_stock?.count ?? 0,
        outOfStock: stockByStatus.out_of_stock?.count ?? 0,
        totalQuantity: stockHealth.reduce(
          (total, entry) => total + (entry.quantity ?? 0),
          0,
        ),
        totalValue: stockHealth.reduce(
          (total, entry) => total + (entry.totalValue ?? 0),
          0,
        ),
      },
      movements: movementTotals,
      requests: {
        pending: requestsByStatus[RequestStatus.PENDING] ?? 0,
        approved:
          (requestsByStatus[RequestStatus.APPROVED] ?? 0) +
          (requestsByStatus[RequestStatus.DEPT_APPROVED] ?? 0) +
          (requestsByStatus[RequestStatus.STORE_APPROVED] ?? 0),
        fulfilled:
          (requestsByStatus[RequestStatus.FULFILLED] ?? 0) +
          (requestsByStatus[RequestStatus.PARTIALLY_FULFILLED] ?? 0),
        rejected: requestsByStatus[RequestStatus.REJECTED] ?? 0,
      },
      purchaseOrders: {
        draft: purchaseOrdersByStatus[PurchaseOrderStatus.DRAFT]?.count ?? 0,
        pendingApproval:
          purchaseOrdersByStatus[PurchaseOrderStatus.PENDING_APPROVAL]
            ?.count ?? 0,
        approved:
          purchaseOrdersByStatus[PurchaseOrderStatus.APPROVED]?.count ?? 0,
        received:
          purchaseOrdersByStatus[PurchaseOrderStatus.RECEIVED]?.count ?? 0,
        totalAmount: purchaseTotals.reduce(
          (total, entry) => total + (entry.totalAmount ?? 0),
          0,
        ),
      },
      topConsumption,
    };
  }

  createSavedReport(data: SavedReportCreateRecord) {
    return SavedReportModel.create(data);
  }

  async listSavedReports(
    organizationId: string,
    filter: SavedReportListFilter = {},
  ) {
    const { page, limit } = pageValues(filter);
    const query: FilterQuery<ISavedReport> = {
      organizationId,
      isDeleted: { $ne: true },
    };
    if (filter.kind) query.kind = filter.kind;
    if (filter.frequency) query.frequency = filter.frequency;
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    if (filter.search) {
      const search = escapeRegex(filter.search);
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const [reports, total] = await Promise.all([
      SavedReportModel.find(query)
        .sort(sort(filter, "createdAt"))
        .skip((page - 1) * limit)
        .limit(limit),
      SavedReportModel.countDocuments(query),
    ]);

    return { reports, pagination: pagination(page, limit, total) };
  }

  findSavedReport(organizationId: string, id: string) {
    return SavedReportModel.findOne({
      _id: id,
      organizationId,
      isDeleted: { $ne: true },
    });
  }

  updateSavedReport(
    organizationId: string,
    id: string,
    data: UpdateQuery<ISavedReport>,
  ) {
    return SavedReportModel.findOneAndUpdate(
      { _id: id, organizationId, isDeleted: { $ne: true } },
      data,
      { new: true, runValidators: true },
    );
  }

  softDeleteSavedReport(
    organizationId: string,
    id: string,
    actorId: string,
  ) {
    return this.updateSavedReport(organizationId, id, {
      isDeleted: true,
      isActive: false,
      deletedAt: new Date(),
      deletedBy: toObjectId(actorId),
    });
  }

  dueScheduledReports(now: Date, organizationId?: string) {
    return SavedReportModel.find({
      ...(organizationId ? { organizationId } : {}),
      isActive: true,
      isDeleted: { $ne: true },
      frequency: { $ne: ReportFrequency.NONE },
      nextRunAt: { $lte: now },
      recipients: { $exists: true, $ne: [] },
    });
  }

  markScheduledRun(id: string, jobId: string, nextRunAt: Date) {
    return SavedReportModel.findByIdAndUpdate(id, {
      lastRunAt: new Date(),
      lastJobId: jobId,
      nextRunAt,
    });
  }
}

export const reportRepository = new ReportRepository();
