import {
  ClientSession,
  FilterQuery,
  Types,
  UpdateQuery,
} from "mongoose";
import {
  ItemUnit,
  StockMovementType,
  StockReferenceType,
  ValuationMethod,
} from "../constants";
import {
  CategoryModel,
  ICategory,
  IInventoryBalance,
  IItem,
  InventoryBalanceModel,
  ItemModel,
  StockBatchModel,
  StockMovementModel,
  WarehouseModel,
  WarehouseZoneModel,
} from "./schemas";

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ItemListFilter extends PaginationOptions {
  search?: string;
  categoryId?: string;
  unit?: ItemUnit;
  isActive?: boolean;
  isAsset?: boolean;
  isBundled?: boolean;
}

export interface CategoryListFilter extends PaginationOptions {
  search?: string;
  parentCategoryId?: string;
  isActive?: boolean;
}

export interface StockListFilter extends PaginationOptions {
  warehouseId?: string;
  warehouseIds?: string[];
  zoneId?: string;
}

export interface BatchListFilter extends PaginationOptions {
  warehouseId?: string;
  warehouseIds?: string[];
  zoneId?: string;
  expiringBefore?: Date;
  includeEmpty?: boolean;
}

export interface MovementListFilter extends PaginationOptions {
  itemId?: string;
  warehouseId?: string;
  warehouseIds?: string[];
  zoneId?: string;
  departmentId?: string;
  type?: StockMovementType;
  referenceType?: StockReferenceType | string;
  from?: Date;
  to?: Date;
}

export interface StockBatchInput {
  organizationId: string;
  itemId: string;
  warehouseId: string;
  zoneId?: string;
  batchNumber: string;
  quantity: number;
  serialNumbers?: string[];
  manufacturingDate?: Date;
  receivedAt?: Date;
  expiryDate?: Date;
  unitCost?: number;
  purchaseOrderId?: string;
  grnId?: string;
}

export interface StockMovementInput {
  organizationId: string;
  itemId: string;
  warehouseId: string;
  zoneId?: string;
  departmentId?: string;
  batchId?: string;
  type: StockMovementType;
  quantity: number;
  balanceAfter: number;
  costPerUnit?: number;
  referenceType?: StockReferenceType | string;
  referenceId?: string;
  serialNumbers?: string[];
  notes?: string;
  performedBy: string;
  occurredAt?: Date;
}

interface LowStockRow {
  _id: Types.ObjectId;
  itemId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  zoneId?: Types.ObjectId;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  effectiveThreshold: number;
  item: {
    _id: Types.ObjectId;
    name: string;
    sku: string;
    unit: string;
    minStockThreshold: number;
  };
  warehouse: {
    _id: Types.ObjectId;
    name: string;
    code: string;
  };
}

interface DeadStockRow {
  _id: Types.ObjectId;
  name: string;
  sku: string;
  unit: string;
  lastMovementAt?: Date;
  totalQuantity: number;
}

interface ExpiringBatchRow {
  _id: Types.ObjectId;
  batchNumber: string;
  remainingQuantity: number;
  expiryDate: Date;
  item: { _id: Types.ObjectId; name: string; sku: string };
  warehouse: { _id: Types.ObjectId; name: string; code: string };
}

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const pageValues = (options: PaginationOptions) => ({
  page: options.page ?? 1,
  limit: options.limit ?? 20,
});

const sort = (
  options: PaginationOptions,
  fallback: string,
): Record<string, 1 | -1> => ({
  [options.sortBy ?? fallback]: options.sortOrder === "asc" ? 1 : -1,
});

const zoneFilter = (zoneId?: string) =>
  zoneId
    ? { zoneId }
    : { zoneId: { $exists: false } };

const normalizeReferenceType = (
  value?: StockReferenceType | string,
): StockReferenceType | undefined => {
  if (!value) return undefined;
  const aliases: Readonly<Record<string, StockReferenceType>> = {
    PurchaseOrder: StockReferenceType.PURCHASE_ORDER,
    GoodsReceivedNote: StockReferenceType.GRN,
    StockRequest: StockReferenceType.STOCK_REQUEST,
    Transfer: StockReferenceType.TRANSFER,
    Manual: StockReferenceType.MANUAL,
  };
  return (
    aliases[value] ??
    Object.values(StockReferenceType).find((candidate) => candidate === value) ??
    StockReferenceType.MANUAL
  );
};

export class InventoryRepository {
  createItem(organizationId: string, data: Record<string, unknown>) {
    return ItemModel.create({ ...data, organizationId });
  }

  findItem(organizationId: string, id: string) {
    return ItemModel.findOne({
      _id: id,
      organizationId,
      isDeleted: { $ne: true },
    }).populate("categoryId", "name code");
  }

  findItemDocument(organizationId: string, id: string) {
    return ItemModel.findOne({
      _id: id,
      organizationId,
      isDeleted: { $ne: true },
    });
  }

  findItemBySku(organizationId: string, sku: string) {
    return ItemModel.findOne({
      organizationId,
      sku: sku.toUpperCase(),
      isDeleted: { $ne: true },
    });
  }

  findItemByScan(organizationId: string, value: string) {
    return ItemModel.findOne({
      organizationId,
      isActive: true,
      isDeleted: { $ne: true },
      $or: [
        { sku: value.toUpperCase() },
        { barcode: value },
        { qrCode: value },
        { "variants.sku": value.toUpperCase() },
        { "variants.barcode": value },
      ],
    }).populate("categoryId", "name code");
  }

  listItems(organizationId: string, filter: ItemListFilter = {}) {
    const query: FilterQuery<IItem> = {
      organizationId,
      isDeleted: { $ne: true },
    };
    if (filter.categoryId) query.categoryId = filter.categoryId;
    if (filter.unit) query.unit = filter.unit;
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    if (filter.isAsset !== undefined) query.isAsset = filter.isAsset;
    if (filter.isBundled !== undefined) query.isBundled = filter.isBundled;
    if (filter.search) {
      const pattern = escapeRegex(filter.search);
      query.$or = [
        { name: { $regex: pattern, $options: "i" } },
        { sku: { $regex: pattern, $options: "i" } },
        { barcode: { $regex: pattern, $options: "i" } },
        { qrCode: { $regex: pattern, $options: "i" } },
        { "variants.sku": { $regex: pattern, $options: "i" } },
        { "variants.barcode": { $regex: pattern, $options: "i" } },
      ];
    }
    return ItemModel.find(query)
      .populate("categoryId", "name code")
      .sort(sort(filter, "name"));
  }

  async listItemsPage(
    organizationId: string,
    filter: ItemListFilter = {},
  ) {
    const { page, limit } = pageValues(filter);
    const query = this.listItems(organizationId, filter);
    const queryFilter = query.getFilter();
    const [items, total] = await Promise.all([
      query.skip((page - 1) * limit).limit(limit),
      ItemModel.countDocuments(queryFilter),
    ]);
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  updateItem(
    organizationId: string,
    id: string,
    data: UpdateQuery<IItem>,
  ) {
    return ItemModel.findOneAndUpdate(
      { _id: id, organizationId, isDeleted: { $ne: true } },
      data,
      {
        new: true,
        runValidators: true,
      },
    ).populate("categoryId", "name code");
  }

  softDeleteItem(organizationId: string, id: string, actorId: string) {
    return this.updateItem(organizationId, id, {
      isDeleted: true,
      isActive: false,
      deletedAt: new Date(),
      deletedBy: actorId,
    });
  }

  archiveItem(organizationId: string, id: string) {
    return this.updateItem(organizationId, id, { isActive: false });
  }

  countItemStock(organizationId: string, itemId: string) {
    return InventoryBalanceModel.countDocuments({
      organizationId,
      itemId,
      isDeleted: { $ne: true },
      $or: [
        { quantity: { $gt: 0 } },
        { reservedQuantity: { $gt: 0 } },
      ],
    });
  }

  createCategory(organizationId: string, data: Partial<ICategory>) {
    return CategoryModel.create({ ...data, organizationId });
  }

  findCategory(organizationId: string, id: string) {
    return CategoryModel.findOne({
      _id: id,
      organizationId,
      isDeleted: { $ne: true },
    }).populate("parentCategoryId", "name code");
  }

  async listCategories(
    organizationId: string,
    filter: CategoryListFilter = {},
  ) {
    const { page, limit } = pageValues(filter);
    const query: FilterQuery<ICategory> = {
      organizationId,
      isDeleted: { $ne: true },
    };
    if (filter.parentCategoryId) {
      query.parentCategoryId = filter.parentCategoryId;
    }
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    if (filter.search) {
      const pattern = escapeRegex(filter.search);
      query.$or = [
        { name: { $regex: pattern, $options: "i" } },
        { code: { $regex: pattern, $options: "i" } },
        { description: { $regex: pattern, $options: "i" } },
      ];
    }
    const [categories, total] = await Promise.all([
      CategoryModel.find(query)
        .populate("parentCategoryId", "name code")
        .sort(sort(filter, "name"))
        .skip((page - 1) * limit)
        .limit(limit),
      CategoryModel.countDocuments(query),
    ]);
    return {
      categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  updateCategory(
    organizationId: string,
    id: string,
    data: UpdateQuery<ICategory>,
  ) {
    return CategoryModel.findOneAndUpdate(
      { _id: id, organizationId, isDeleted: { $ne: true } },
      data,
      { new: true, runValidators: true },
    ).populate("parentCategoryId", "name code");
  }

  softDeleteCategory(
    organizationId: string,
    id: string,
    actorId: string,
  ) {
    return this.updateCategory(organizationId, id, {
      isDeleted: true,
      isActive: false,
      deletedAt: new Date(),
      deletedBy: actorId,
    });
  }

  countCategoryChildren(organizationId: string, categoryId: string) {
    return CategoryModel.countDocuments({
      organizationId,
      parentCategoryId: categoryId,
      isDeleted: { $ne: true },
    });
  }

  countCategoryItems(organizationId: string, categoryId: string) {
    return ItemModel.countDocuments({
      organizationId,
      categoryId,
      isDeleted: { $ne: true },
    });
  }

  async wouldCreateCategoryCycle(
    organizationId: string,
    categoryId: string,
    parentCategoryId: string,
  ) {
    let currentId: string | undefined = parentCategoryId;
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      if (currentId === categoryId) return true;
      visited.add(currentId);
      const category: { parentCategoryId?: Types.ObjectId } | null =
        await CategoryModel.findOne({
          _id: currentId,
          organizationId,
          isDeleted: { $ne: true },
        })
          .select("parentCategoryId")
          .lean<{ parentCategoryId?: Types.ObjectId }>();
      currentId = category?.parentCategoryId?.toString();
    }
    return false;
  }

  findWarehouse(organizationId: string, warehouseId: string) {
    return WarehouseModel.findOne({
      _id: warehouseId,
      organizationId,
      isActive: true,
      isDeleted: { $ne: true },
    });
  }

  findZone(
    organizationId: string,
    warehouseId: string,
    zoneId: string,
  ) {
    return WarehouseZoneModel.findOne({
      _id: zoneId,
      organizationId,
      warehouseId,
      isActive: true,
      isDeleted: { $ne: true },
    });
  }

  findBalance(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    session?: ClientSession,
    zoneId?: string,
  ) {
    return InventoryBalanceModel.findOne({
      organizationId,
      itemId,
      warehouseId,
      ...zoneFilter(zoneId),
      isDeleted: { $ne: true },
    }).session(session ?? null);
  }

  setBalance(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    data: {
      quantity: number;
      reservedQuantity: number;
      averageCost: number;
      totalValue: number;
      lastMovementAt: Date;
    },
    session?: ClientSession,
    zoneId?: string,
  ) {
    return InventoryBalanceModel.findOneAndUpdate(
      {
        organizationId,
        itemId,
        warehouseId,
        ...zoneFilter(zoneId),
        isDeleted: { $ne: true },
      },
      {
        $set: {
          ...data,
          availableQuantity: Math.max(
            0,
            data.quantity - data.reservedQuantity,
          ),
        },
        $setOnInsert: {
          organizationId,
          itemId,
          warehouseId,
          ...(zoneId ? { zoneId } : {}),
          isDeleted: false,
        },
      },
      {
        new: true,
        upsert: true,
        session,
        runValidators: true,
      },
    );
  }

  incrementBalance(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    quantity: number,
    session?: ClientSession,
    zoneId?: string,
    costPerUnit = 0,
  ) {
    return this.findBalance(
      organizationId,
      itemId,
      warehouseId,
      session,
      zoneId,
    ).then((current) => {
      const currentQuantity = current?.quantity ?? 0;
      const reservedQuantity = current?.reservedQuantity ?? 0;
      const averageCost = current?.averageCost ?? 0;
      const currentValue =
        current?.totalValue ?? currentQuantity * averageCost;
      const nextQuantity = currentQuantity + quantity;
      const nextValue = currentValue + quantity * costPerUnit;
      return this.setBalance(
        organizationId,
        itemId,
        warehouseId,
        {
          quantity: nextQuantity,
          reservedQuantity,
          averageCost: nextQuantity > 0 ? nextValue / nextQuantity : 0,
          totalValue: nextValue,
          lastMovementAt: new Date(),
        },
        session,
        zoneId,
      );
    });
  }

  decrementBalance(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    quantity: number,
    session?: ClientSession,
    zoneId?: string,
    costPerUnit?: number,
  ) {
    return this.findBalance(
      organizationId,
      itemId,
      warehouseId,
      session,
      zoneId,
    ).then((current) => {
      if (!current) return null;
      const averageCost = current.averageCost ?? 0;
      const availableQuantity =
        current.availableQuantity ??
        Math.max(0, current.quantity - current.reservedQuantity);
      if (availableQuantity < quantity) return null;
      const nextQuantity = current.quantity - quantity;
      const currentValue =
        current.totalValue ?? current.quantity * averageCost;
      const nextValue = Math.max(
        0,
        currentValue - quantity * (costPerUnit ?? averageCost),
      );
      return this.setBalance(
        organizationId,
        itemId,
        warehouseId,
        {
          quantity: nextQuantity,
          reservedQuantity: current.reservedQuantity,
          averageCost: nextQuantity > 0 ? nextValue / nextQuantity : 0,
          totalValue: nextValue,
          lastMovementAt: new Date(),
        },
        session,
        zoneId,
      );
    });
  }

  reserveBalance(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    quantity: number,
    session: ClientSession,
    zoneId?: string,
  ) {
    return InventoryBalanceModel.findOneAndUpdate(
      {
        organizationId,
        itemId,
        warehouseId,
        ...zoneFilter(zoneId),
        isDeleted: { $ne: true },
        $expr: {
          $gte: [
            {
              $ifNull: [
                "$availableQuantity",
                {
                  $subtract: [
                    { $ifNull: ["$quantity", 0] },
                    { $ifNull: ["$reservedQuantity", 0] },
                  ],
                },
              ],
            },
            quantity,
          ],
        },
      },
      [
        {
          $set: {
            reservedQuantity: {
              $add: [
                { $ifNull: ["$reservedQuantity", 0] },
                quantity,
              ],
            },
            availableQuantity: {
              $subtract: [
                {
                  $ifNull: [
                    "$availableQuantity",
                    {
                      $subtract: [
                        { $ifNull: ["$quantity", 0] },
                        { $ifNull: ["$reservedQuantity", 0] },
                      ],
                    },
                  ],
                },
                quantity,
              ],
            },
          },
        },
      ],
      { new: true, session },
    );
  }

  releaseReservedBalance(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    quantity: number,
    session: ClientSession,
    zoneId?: string,
  ) {
    return InventoryBalanceModel.findOneAndUpdate(
      {
        organizationId,
        itemId,
        warehouseId,
        ...zoneFilter(zoneId),
        isDeleted: { $ne: true },
        $expr: {
          $gte: [
            { $ifNull: ["$reservedQuantity", 0] },
            quantity,
          ],
        },
      },
      [
        {
          $set: {
            reservedQuantity: {
              $subtract: [
                { $ifNull: ["$reservedQuantity", 0] },
                quantity,
              ],
            },
            availableQuantity: {
              $subtract: [
                { $ifNull: ["$quantity", 0] },
                {
                  $subtract: [
                    { $ifNull: ["$reservedQuantity", 0] },
                    quantity,
                  ],
                },
              ],
            },
          },
        },
      ],
      { new: true, session },
    );
  }

  consumeReservedBalance(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    quantity: number,
    costPerUnit: number,
    session: ClientSession,
    zoneId?: string,
  ) {
    return InventoryBalanceModel.findOneAndUpdate(
      {
        organizationId,
        itemId,
        warehouseId,
        ...zoneFilter(zoneId),
        isDeleted: { $ne: true },
        $expr: {
          $and: [
            {
              $gte: [
                { $ifNull: ["$reservedQuantity", 0] },
                quantity,
              ],
            },
            {
              $gte: [
                { $ifNull: ["$quantity", 0] },
                quantity,
              ],
            },
          ],
        },
      },
      [
        {
          $set: {
            quantity: {
              $subtract: [
                { $ifNull: ["$quantity", 0] },
                quantity,
              ],
            },
            reservedQuantity: {
              $subtract: [
                { $ifNull: ["$reservedQuantity", 0] },
                quantity,
              ],
            },
            totalValue: {
              $max: [
                0,
                {
                  $subtract: [
                    {
                      $ifNull: [
                        "$totalValue",
                        {
                          $multiply: [
                            { $ifNull: ["$quantity", 0] },
                            { $ifNull: ["$averageCost", 0] },
                          ],
                        },
                      ],
                    },
                    quantity * costPerUnit,
                  ],
                },
              ],
            },
            lastMovementAt: new Date(),
          },
        },
        {
          $set: {
            availableQuantity: {
              $subtract: ["$quantity", "$reservedQuantity"],
            },
            averageCost: {
              $cond: [
                { $gt: ["$quantity", 0] },
                { $divide: ["$totalValue", "$quantity"] },
                0,
              ],
            },
          },
        },
      ],
      { new: true, session },
    );
  }

  listBalances(
    organizationId: string,
    warehouseId?: string,
    itemId?: string,
  ) {
    const filter: FilterQuery<IInventoryBalance> = {
      organizationId,
      isDeleted: { $ne: true },
    };
    if (warehouseId) filter.warehouseId = warehouseId;
    if (itemId) filter.itemId = itemId;
    return InventoryBalanceModel.find(filter)
      .populate(
        "itemId",
        "name sku unit minStockThreshold barcode qrCode isActive",
      )
      .populate("warehouseId", "name code")
      .populate("zoneId", "name code")
      .sort({ updatedAt: -1 });
  }

  async listItemStockPage(
    organizationId: string,
    itemId: string,
    filter: StockListFilter = {},
  ) {
    const { page, limit } = pageValues(filter);
    const query: FilterQuery<IInventoryBalance> = {
      organizationId,
      itemId,
      isDeleted: { $ne: true },
    };
    if (filter.warehouseId) query.warehouseId = filter.warehouseId;
    if (filter.warehouseIds) query.warehouseId = { $in: filter.warehouseIds };
    if (filter.zoneId) query.zoneId = filter.zoneId;
    const [stock, total] = await Promise.all([
      InventoryBalanceModel.find(query)
        .populate("warehouseId", "name code type")
        .populate("zoneId", "name code")
        .sort(sort(filter, "updatedAt"))
        .skip((page - 1) * limit)
        .limit(limit),
      InventoryBalanceModel.countDocuments(query),
    ]);
    return {
      stock,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listLowStockPage(
    organizationId: string,
    filter: StockListFilter = {},
  ) {
    const { page, limit } = pageValues(filter);
    const match: Record<string, unknown> = {
      organizationId: new Types.ObjectId(organizationId),
      isDeleted: { $ne: true },
    };
    if (filter.warehouseId) {
      match.warehouseId = new Types.ObjectId(filter.warehouseId);
    } else if (filter.warehouseIds) {
      match.warehouseId = {
        $in: filter.warehouseIds.map((id) => new Types.ObjectId(id)),
      };
    }
    if (filter.zoneId) match.zoneId = new Types.ObjectId(filter.zoneId);
    const [result] = await InventoryBalanceModel.aggregate<{
      data: LowStockRow[];
      total: Array<{ count: number }>;
    }>([
      { $match: match },
      {
        $lookup: {
          from: "items",
          let: { itemId: "$itemId", organizationId: "$organizationId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$itemId"] },
                    { $eq: ["$organizationId", "$$organizationId"] },
                    { $ne: ["$isDeleted", true] },
                    { $eq: ["$isActive", true] },
                  ],
                },
              },
            },
          ],
          as: "item",
        },
      },
      { $unwind: "$item" },
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
          effectiveThreshold: {
            $ifNull: ["$minStockThreshold", "$item.minStockThreshold"],
          },
        },
      },
      {
        $match: {
          $expr: {
            $lte: ["$availableQuantity", "$effectiveThreshold"],
          },
        },
      },
      {
        $lookup: {
          from: "warehouses",
          localField: "warehouseId",
          foreignField: "_id",
          as: "warehouse",
        },
      },
      { $unwind: "$warehouse" },
      { $sort: sort(filter, "availableQuantity") },
      {
        $facet: {
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]);
    const total = result?.total[0]?.count ?? 0;
    return {
      rows: result?.data ?? [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  listLowStock(organizationId: string, warehouseId?: string) {
    return this.listLowStockPage(
      organizationId,
      warehouseId ? { warehouseId, limit: 100 } : { limit: 100 },
    ).then((result) => result.rows);
  }

  async listDeadStock(
    organizationId: string,
    inactiveSince: Date,
    filter: StockListFilter = {},
  ) {
    const { page, limit } = pageValues(filter);
    const warehouseExpressions: Record<string, unknown>[] = filter.warehouseId
      ? [
          {
            $eq: [
              "$warehouseId",
              new Types.ObjectId(filter.warehouseId),
            ],
          },
        ]
      : filter.warehouseIds
        ? [
            {
              $in: [
                "$warehouseId",
                filter.warehouseIds.map((id) => new Types.ObjectId(id)),
              ],
            },
          ]
        : [];
    const [result] = await ItemModel.aggregate<{
      data: DeadStockRow[];
      total: Array<{ count: number }>;
    }>([
      {
        $match: {
          organizationId: new Types.ObjectId(organizationId),
          isActive: true,
          isDeleted: { $ne: true },
        },
      },
      {
        $lookup: {
          from: "stockmovements",
          let: { itemId: "$_id", organizationId: "$organizationId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$itemId", "$$itemId"] },
                    { $eq: ["$organizationId", "$$organizationId"] },
                    { $ne: ["$isDeleted", true] },
                    ...warehouseExpressions,
                  ],
                },
              },
            },
            { $sort: { occurredAt: -1 } },
            { $limit: 1 },
          ],
          as: "lastMovement",
        },
      },
      {
        $lookup: {
          from: "inventorybalances",
          let: { itemId: "$_id", organizationId: "$organizationId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$itemId", "$$itemId"] },
                    { $eq: ["$organizationId", "$$organizationId"] },
                    { $ne: ["$isDeleted", true] },
                    ...warehouseExpressions,
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                totalQuantity: { $sum: "$quantity" },
              },
            },
          ],
          as: "stock",
        },
      },
      {
        $addFields: {
          lastMovementAt: { $arrayElemAt: ["$lastMovement.occurredAt", 0] },
          totalQuantity: {
            $ifNull: [{ $arrayElemAt: ["$stock.totalQuantity", 0] }, 0],
          },
        },
      },
      {
        $match: {
          totalQuantity: { $gt: 0 },
          $or: [
            { lastMovementAt: { $lt: inactiveSince } },
            { lastMovementAt: { $exists: false } },
          ],
        },
      },
      { $sort: sort(filter, "lastMovementAt") },
      {
        $facet: {
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                name: 1,
                sku: 1,
                unit: 1,
                lastMovementAt: 1,
                totalQuantity: 1,
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]);
    const total = result?.total[0]?.count ?? 0;
    return {
      rows: result?.data ?? [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listExpiringBatches(
    organizationId: string,
    from: Date,
    to: Date,
    filter: StockListFilter = {},
  ) {
    const { page, limit } = pageValues(filter);
    const warehouseMatch = filter.warehouseId
      ? { warehouseId: new Types.ObjectId(filter.warehouseId) }
      : filter.warehouseIds
        ? {
            warehouseId: {
              $in: filter.warehouseIds.map(
                (id) => new Types.ObjectId(id),
              ),
            },
          }
        : {};
    const [result] = await StockBatchModel.aggregate<{
      data: ExpiringBatchRow[];
      total: Array<{ count: number }>;
    }>([
      {
        $match: {
          organizationId: new Types.ObjectId(organizationId),
          ...warehouseMatch,
          expiryDate: { $gte: from, $lte: to },
          isDeleted: { $ne: true },
          $expr: {
            $gt: [
              { $ifNull: ["$remainingQuantity", "$quantity"] },
              0,
            ],
          },
        },
      },
      {
        $lookup: {
          from: "items",
          localField: "itemId",
          foreignField: "_id",
          as: "item",
        },
      },
      { $unwind: "$item" },
      {
        $lookup: {
          from: "warehouses",
          localField: "warehouseId",
          foreignField: "_id",
          as: "warehouse",
        },
      },
      { $unwind: "$warehouse" },
      { $sort: sort(filter, "expiryDate") },
      {
        $facet: {
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]);
    const total = result?.total[0]?.count ?? 0;
    return {
      rows: result?.data ?? [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async upsertBatch(data: StockBatchInput, session?: ClientSession) {
    const costPerUnit = data.unitCost ?? 0;
    const filter = {
      organizationId: data.organizationId,
      itemId: data.itemId,
      warehouseId: data.warehouseId,
      ...zoneFilter(data.zoneId),
      batchNumber: data.batchNumber.toUpperCase(),
      isDeleted: { $ne: true },
    };
    const existing = await StockBatchModel.findOne(filter).session(
      session ?? null,
    );
    if (!existing) {
      const [batch] = await StockBatchModel.create(
        [
          {
            organizationId: data.organizationId,
            itemId: data.itemId,
            warehouseId: data.warehouseId,
            ...(data.zoneId ? { zoneId: data.zoneId } : {}),
            batchNumber: data.batchNumber.toUpperCase(),
            serialNumbers: data.serialNumbers ?? [],
            receivedQuantity: data.quantity,
            quantity: data.quantity,
            remainingQuantity: data.quantity,
            manufacturingDate: data.manufacturingDate,
            receivedAt: data.receivedAt ?? new Date(),
            expiryDate: data.expiryDate,
            unitCost: costPerUnit,
            costPerUnit,
            purchaseOrderId: data.purchaseOrderId,
            grnId: data.grnId,
            isDeleted: false,
          },
        ],
        { session },
      );
      return batch;
    }

    const existingRemaining =
      existing.remainingQuantity ?? existing.quantity;
    const existingReceived =
      existing.receivedQuantity ?? existing.quantity;
    const serialNumbers = [
      ...new Set([
        ...(existing.serialNumbers ?? []),
        ...(data.serialNumbers ?? []),
      ]),
    ];
    return StockBatchModel.findByIdAndUpdate(
      existing.id,
      {
        receivedQuantity: existingReceived + data.quantity,
        quantity: existingRemaining + data.quantity,
        remainingQuantity: existingRemaining + data.quantity,
        serialNumbers,
        ...(data.expiryDate ? { expiryDate: data.expiryDate } : {}),
        ...(data.manufacturingDate
          ? { manufacturingDate: data.manufacturingDate }
          : {}),
        ...(data.purchaseOrderId
          ? { purchaseOrderId: data.purchaseOrderId }
          : {}),
        ...(data.grnId ? { grnId: data.grnId } : {}),
        unitCost: costPerUnit,
        costPerUnit,
      },
      { new: true, session, runValidators: true },
    ).orFail();
  }

  findAvailableBatches(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    session?: ClientSession,
    zoneId?: string,
    valuationMethod: ValuationMethod = ValuationMethod.FEFO,
  ) {
    const batchSort: Record<string, 1 | -1> =
      valuationMethod === ValuationMethod.LIFO
        ? { receivedAt: -1 }
        : valuationMethod === ValuationMethod.FIFO
          ? { receivedAt: 1 }
          : { expiryDate: 1, receivedAt: 1 };
    return StockBatchModel.find({
      organizationId,
      itemId,
      warehouseId,
      ...zoneFilter(zoneId),
      isDeleted: { $ne: true },
      $and: [
        {
          $or: [
            { remainingQuantity: { $gt: 0 } },
            {
              remainingQuantity: { $exists: false },
              quantity: { $gt: 0 },
            },
          ],
        },
        {
          $or: [
            { expiryDate: { $exists: false } },
            { expiryDate: { $gt: new Date() } },
          ],
        },
      ],
    })
      .sort(batchSort)
      .session(session ?? null);
  }

  findBatchContainingSerials(
    organizationId: string,
    serialNumbers: string[],
    session?: ClientSession,
  ) {
    return StockBatchModel.findOne({
      organizationId,
      serialNumbers: { $in: serialNumbers },
      isDeleted: { $ne: true },
    }).session(session ?? null);
  }

  decrementBatch(
    id: string,
    quantity: number,
    session?: ClientSession,
    serialNumbers: string[] = [],
  ) {
    const serialUpdate = serialNumbers.length
      ? {
          $filter: {
            input: { $ifNull: ["$serialNumbers", []] },
            as: "serial",
            cond: { $not: { $in: ["$$serial", serialNumbers] } },
          },
        }
      : { $ifNull: ["$serialNumbers", []] };
    return StockBatchModel.findOneAndUpdate(
      {
        _id: id,
        isDeleted: { $ne: true },
        $expr: {
          $gte: [
            { $ifNull: ["$remainingQuantity", "$quantity"] },
            quantity,
          ],
        },
        ...(serialNumbers.length
          ? { serialNumbers: { $all: serialNumbers } }
          : {}),
      },
      [
        {
          $set: {
            quantity: {
              $subtract: [
                { $ifNull: ["$remainingQuantity", "$quantity"] },
                quantity,
              ],
            },
            remainingQuantity: {
              $subtract: [
                { $ifNull: ["$remainingQuantity", "$quantity"] },
                quantity,
              ],
            },
            serialNumbers: serialUpdate,
          },
        },
      ],
      { new: true, session, runValidators: true },
    );
  }

  async listBatches(
    organizationId: string,
    itemId: string,
    filter: BatchListFilter = {},
  ) {
    const { page, limit } = pageValues(filter);
    const query: FilterQuery<unknown> = {
      organizationId,
      itemId,
      isDeleted: { $ne: true },
    };
    if (filter.warehouseId) query.warehouseId = filter.warehouseId;
    if (filter.warehouseIds) query.warehouseId = { $in: filter.warehouseIds };
    if (filter.zoneId) query.zoneId = filter.zoneId;
    if (filter.expiringBefore) {
      query.expiryDate = { $lte: filter.expiringBefore };
    }
    if (!filter.includeEmpty) {
      query.$or = [
        { remainingQuantity: { $gt: 0 } },
        {
          remainingQuantity: { $exists: false },
          quantity: { $gt: 0 },
        },
      ];
    }
    const [batches, total] = await Promise.all([
      StockBatchModel.find(query)
        .populate("warehouseId", "name code")
        .populate("zoneId", "name code")
        .sort(sort(filter, "expiryDate"))
        .skip((page - 1) * limit)
        .limit(limit),
      StockBatchModel.countDocuments(query),
    ]);
    return {
      batches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  createMovement(data: StockMovementInput, session?: ClientSession) {
    const costPerUnit = data.costPerUnit ?? 0;
    const referenceType = normalizeReferenceType(data.referenceType);
    return StockMovementModel.create(
      [
        {
          ...data,
          referenceType,
          costPerUnit,
          totalCost: costPerUnit * data.quantity,
          serialNumbers: data.serialNumbers ?? [],
        },
      ],
      { session },
    ).then(([movement]) => movement);
  }

  listMovements(
    organizationId: string,
    filter: MovementListFilter,
  ) {
    const query: Record<string, unknown> = {
      organizationId,
      isDeleted: { $ne: true },
    };
    if (filter.itemId) query.itemId = filter.itemId;
    if (filter.warehouseId) query.warehouseId = filter.warehouseId;
    if (filter.warehouseIds) query.warehouseId = { $in: filter.warehouseIds };
    if (filter.zoneId) query.zoneId = filter.zoneId;
    if (filter.departmentId) query.departmentId = filter.departmentId;
    if (filter.type) query.type = filter.type;
    if (filter.referenceType) query.referenceType = filter.referenceType;
    if (filter.from || filter.to) {
      query.occurredAt = {
        ...(filter.from ? { $gte: filter.from } : {}),
        ...(filter.to ? { $lte: filter.to } : {}),
      };
    }
    return StockMovementModel.find(query)
      .populate("itemId", "name sku unit barcode")
      .populate("warehouseId", "name code")
      .populate("zoneId", "name code")
      .populate("departmentId", "name code")
      .populate("batchId", "batchNumber expiryDate")
      .populate("performedBy", "name email")
      .sort(sort(filter, "occurredAt"));
  }

  async listMovementsPage(
    organizationId: string,
    filter: MovementListFilter,
  ) {
    const { page, limit } = pageValues(filter);
    const query = this.listMovements(organizationId, filter);
    const queryFilter = query.getFilter();
    const [movements, total] = await Promise.all([
      query.skip((page - 1) * limit).limit(limit),
      StockMovementModel.countDocuments(queryFilter),
    ]);
    return {
      movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const inventoryRepository = new InventoryRepository();
