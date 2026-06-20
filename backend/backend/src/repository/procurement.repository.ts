import {
  ClientSession,
  FilterQuery,
  Types,
  UpdateQuery,
} from "mongoose";
import {
  PaymentMode,
  PaymentTerm,
  PurchaseOrderStatus,
  SortOrder,
} from "../constants";
import {
  GoodsReceivedNoteModel,
  IGoodsReceivedNote,
  IPayment,
  IPurchaseOrder,
  IVendor,
  IVendorAddress,
  IVendorBankDetails,
  PaymentModel,
  PurchaseOrderModel,
  VendorModel,
} from "./schemas";

export interface AttachmentInput {
  name: string;
  url: string;
}

export interface PaginationFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc" | SortOrder;
}

export interface VendorListFilter extends PaginationFilter {
  search?: string;
  isActive?: boolean;
  paymentTerms?: PaymentTerm;
}

export interface VendorCreateRecord {
  organizationId: string;
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: IVendorAddress;
  taxId?: string;
  gstin?: string;
  panNumber?: string;
  bankDetails?: IVendorBankDetails;
  paymentTerms?: PaymentTerm;
  isActive?: boolean;
}

export interface PurchaseOrderItemRecord {
  itemId: string;
  variantId?: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  taxRate: number;
  totalCost: number;
  expectedDeliveryDate?: Date;
  notes?: string;
}

export interface PurchaseOrderCreateRecord {
  organizationId: string;
  poNumber: string;
  vendorId: string;
  warehouseId: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItemRecord[];
  subTotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  expectedDeliveryDate?: Date;
  notes?: string;
  attachments?: AttachmentInput[];
  createdBy: string;
}

export interface PurchaseOrderListFilter extends PaginationFilter {
  search?: string;
  status?: PurchaseOrderStatus;
  vendorId?: string;
  warehouseId?: string;
  warehouseIds?: string[];
  from?: Date;
  to?: Date;
}

export interface GrnItemRecord {
  itemId: string;
  variantId?: string;
  orderedQuantity: number;
  receivedQuantity: number;
  rejectedQuantity: number;
  batchNumber?: string;
  serialNumbers?: string[];
  manufacturingDate?: Date;
  expiryDate?: Date;
  unitCost: number;
  condition: string;
}

export interface GrnCreateRecord {
  organizationId: string;
  grnNumber: string;
  purchaseOrderId: string;
  vendorId: string;
  warehouseId: string;
  receivedBy: string;
  receivedAt: Date;
  items: GrnItemRecord[];
  deliveryNoteNumber?: string;
  invoiceNumber?: string;
  invoiceDate?: Date;
  invoiceAmount?: number;
  qualityCheckPassed?: boolean;
  qualityNotes?: string;
  notes?: string;
  attachments?: AttachmentInput[];
}

export interface GrnListFilter extends PaginationFilter {
  purchaseOrderId?: string;
  vendorId?: string;
  warehouseId?: string;
  warehouseIds?: string[];
  from?: Date;
  to?: Date;
}

export interface PaymentCreateRecord {
  organizationId: string;
  vendorId: string;
  purchaseOrderId?: string;
  amount: number;
  paymentDate: Date;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  notes?: string;
  attachments?: AttachmentInput[];
  recordedBy: string;
}

export interface PaymentListFilter extends PaginationFilter {
  vendorId?: string;
  purchaseOrderId?: string;
  paymentMode?: PaymentMode;
  from?: Date;
  to?: Date;
}

export interface VendorItemHistory {
  vendorId: Types.ObjectId;
  avgUnitCost: number;
  totalQuantity: number;
  totalAmount: number;
  orderCount: number;
  lastPurchaseAt: Date;
}

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const pageValues = (filter: PaginationFilter) => ({
  page: filter.page ?? 1,
  limit: filter.limit ?? 20,
});

const sort = (
  filter: PaginationFilter,
  fallback: string,
): Record<string, 1 | -1> => ({
  [filter.sortBy ?? fallback]: filter.sortOrder === "asc" ? 1 : -1,
});

const dateRange = (from?: Date, to?: Date) => {
  if (!from && !to) return undefined;
  return {
    ...(from ? { $gte: from } : {}),
    ...(to ? { $lte: to } : {}),
  };
};

const pagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

export class ProcurementRepository {
  createVendor(data: VendorCreateRecord, session?: ClientSession) {
    if (session) {
      return VendorModel.create([data], { session }).then(([vendor]) => vendor);
    }
    return VendorModel.create(data);
  }

  findVendor(organizationId: string, id: string) {
    return VendorModel.findOne({
      _id: id,
      organizationId,
      isDeleted: { $ne: true },
    });
  }

  async listVendors(
    organizationId: string,
    filter: VendorListFilter = {},
  ) {
    const { page, limit } = pageValues(filter);
    const query: FilterQuery<IVendor> = {
      organizationId,
      isDeleted: { $ne: true },
    };
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    if (filter.paymentTerms) query.paymentTerms = filter.paymentTerms;
    if (filter.search) {
      const search = escapeRegex(filter.search);
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
      ];
    }
    const [vendors, total] = await Promise.all([
      VendorModel.find(query)
        .sort(sort(filter, "name"))
        .skip((page - 1) * limit)
        .limit(limit),
      VendorModel.countDocuments(query),
    ]);
    return { vendors, pagination: pagination(page, limit, total) };
  }

  updateVendor(
    organizationId: string,
    id: string,
    data: UpdateQuery<IVendor>,
    session?: ClientSession,
  ) {
    return VendorModel.findOneAndUpdate(
      { _id: id, organizationId, isDeleted: { $ne: true } },
      data,
      { new: true, runValidators: true, session },
    );
  }

  softDeleteVendor(organizationId: string, id: string, actorId: string) {
    return this.updateVendor(organizationId, id, {
      isDeleted: true,
      isActive: false,
      deletedAt: new Date(),
      deletedBy: new Types.ObjectId(actorId),
    });
  }

  countVendorOpenPurchaseOrders(organizationId: string, vendorId: string) {
    return PurchaseOrderModel.countDocuments({
      organizationId,
      vendorId,
      isDeleted: { $ne: true },
      status: {
        $nin: [
          PurchaseOrderStatus.RECEIVED,
          PurchaseOrderStatus.REJECTED,
          PurchaseOrderStatus.CANCELLED,
        ],
      },
    });
  }

  createPurchaseOrder(
    data: PurchaseOrderCreateRecord,
    session?: ClientSession,
  ) {
    if (session) {
      return PurchaseOrderModel.create([data], { session }).then(([po]) => po);
    }
    return PurchaseOrderModel.create(data);
  }

  findPurchaseOrder(organizationId: string, id: string) {
    return PurchaseOrderModel.findOne({
      _id: id,
      organizationId,
      isDeleted: { $ne: true },
    })
      .populate("vendorId", "name code email phone paymentTerms rating")
      .populate("warehouseId", "name code")
      .populate("items.itemId", "name sku unit trackBatches trackExpiry");
  }

  findPurchaseOrderDocument(
    organizationId: string,
    id: string,
    session?: ClientSession,
  ) {
    return PurchaseOrderModel.findOne({
      _id: id,
      organizationId,
      isDeleted: { $ne: true },
    }).session(session ?? null);
  }

  async listPurchaseOrders(
    organizationId: string,
    filter: PurchaseOrderListFilter = {},
  ) {
    const { page, limit } = pageValues(filter);
    const query: FilterQuery<IPurchaseOrder> = {
      organizationId,
      isDeleted: { $ne: true },
    };
    if (filter.status) query.status = filter.status;
    if (filter.vendorId) query.vendorId = filter.vendorId;
    if (filter.warehouseId) query.warehouseId = filter.warehouseId;
    if (filter.warehouseIds) query.warehouseId = { $in: filter.warehouseIds };
    const createdRange = dateRange(filter.from, filter.to);
    if (createdRange) query.createdAt = createdRange;
    if (filter.search) {
      const search = escapeRegex(filter.search);
      query.poNumber = { $regex: search, $options: "i" };
    }
    const [purchaseOrders, total] = await Promise.all([
      PurchaseOrderModel.find(query)
        .populate("vendorId", "name code")
        .populate("warehouseId", "name code")
        .sort(sort(filter, "createdAt"))
        .skip((page - 1) * limit)
        .limit(limit),
      PurchaseOrderModel.countDocuments(query),
    ]);
    return {
      purchaseOrders,
      pagination: pagination(page, limit, total),
    };
  }

  updatePurchaseOrder(
    organizationId: string,
    id: string,
    data: UpdateQuery<IPurchaseOrder>,
    session?: ClientSession,
  ) {
    return PurchaseOrderModel.findOneAndUpdate(
      { _id: id, organizationId, isDeleted: { $ne: true } },
      data,
      { new: true, runValidators: true, session },
    );
  }

  updatePurchaseOrderStatus(
    organizationId: string,
    id: string,
    currentStatuses: PurchaseOrderStatus[],
    update: UpdateQuery<IPurchaseOrder>,
    session?: ClientSession,
  ) {
    return PurchaseOrderModel.findOneAndUpdate(
      {
        _id: id,
        organizationId,
        status: { $in: currentStatuses },
        isDeleted: { $ne: true },
      },
      update,
      { new: true, runValidators: true, session },
    );
  }

  markVendorStatsCounted(
    organizationId: string,
    purchaseOrderId: string,
    session: ClientSession,
  ) {
    return PurchaseOrderModel.findOneAndUpdate(
      {
        _id: purchaseOrderId,
        organizationId,
        vendorStatsCounted: false,
        isDeleted: { $ne: true },
      },
      { vendorStatsCounted: true },
      { new: true, runValidators: true, session },
    );
  }

  updateVendorStats(
    organizationId: string,
    vendorId: string,
    totalAmount: number,
    rating: number,
    session?: ClientSession,
  ) {
    return VendorModel.findOneAndUpdate(
      { _id: vendorId, organizationId, isDeleted: { $ne: true } },
      {
        $inc: { totalOrders: 1, totalAmount },
        $set: { rating },
      },
      { new: true, runValidators: true, session },
    );
  }

  createGrn(data: GrnCreateRecord, session?: ClientSession) {
    if (session) {
      return GoodsReceivedNoteModel.create([data], { session }).then(
        ([grn]) => grn,
      );
    }
    return GoodsReceivedNoteModel.create(data);
  }

  findGrn(organizationId: string, id: string) {
    return GoodsReceivedNoteModel.findOne({
      _id: id,
      organizationId,
      isDeleted: { $ne: true },
    })
      .populate("purchaseOrderId", "poNumber status totalAmount")
      .populate("vendorId", "name code")
      .populate("warehouseId", "name code")
      .populate("items.itemId", "name sku unit");
  }

  async listGrns(organizationId: string, filter: GrnListFilter = {}) {
    const { page, limit } = pageValues(filter);
    const query: FilterQuery<IGoodsReceivedNote> = {
      organizationId,
      isDeleted: { $ne: true },
    };
    if (filter.purchaseOrderId) query.purchaseOrderId = filter.purchaseOrderId;
    if (filter.vendorId) query.vendorId = filter.vendorId;
    if (filter.warehouseId) query.warehouseId = filter.warehouseId;
    if (filter.warehouseIds) query.warehouseId = { $in: filter.warehouseIds };
    const receivedRange = dateRange(filter.from, filter.to);
    if (receivedRange) query.receivedAt = receivedRange;
    const [grns, total] = await Promise.all([
      GoodsReceivedNoteModel.find(query)
        .populate("purchaseOrderId", "poNumber")
        .populate("vendorId", "name code")
        .populate("warehouseId", "name code")
        .populate("items.itemId", "name sku unit")
        .sort(sort(filter, "receivedAt"))
        .skip((page - 1) * limit)
        .limit(limit),
      GoodsReceivedNoteModel.countDocuments(query),
    ]);
    return { grns, pagination: pagination(page, limit, total) };
  }

  createPayment(data: PaymentCreateRecord, session?: ClientSession) {
    if (session) {
      return PaymentModel.create([data], { session }).then(
        ([payment]) => payment,
      );
    }
    return PaymentModel.create(data);
  }

  async listPayments(organizationId: string, filter: PaymentListFilter = {}) {
    const { page, limit } = pageValues(filter);
    const query: FilterQuery<IPayment> = {
      organizationId,
      isDeleted: { $ne: true },
    };
    if (filter.vendorId) query.vendorId = filter.vendorId;
    if (filter.purchaseOrderId) query.purchaseOrderId = filter.purchaseOrderId;
    if (filter.paymentMode) query.paymentMode = filter.paymentMode;
    const paymentRange = dateRange(filter.from, filter.to);
    if (paymentRange) query.paymentDate = paymentRange;
    const [payments, total] = await Promise.all([
      PaymentModel.find(query)
        .populate("vendorId", "name code")
        .populate("purchaseOrderId", "poNumber status totalAmount")
        .sort(sort(filter, "paymentDate"))
        .skip((page - 1) * limit)
        .limit(limit),
      PaymentModel.countDocuments(query),
    ]);
    return { payments, pagination: pagination(page, limit, total) };
  }

  listVendorOrders(
    organizationId: string,
    vendorId: string,
    filter: PurchaseOrderListFilter = {},
  ) {
    return this.listPurchaseOrders(organizationId, { ...filter, vendorId });
  }

  listVendorPayments(
    organizationId: string,
    vendorId: string,
    filter: PaymentListFilter = {},
  ) {
    return this.listPayments(organizationId, { ...filter, vendorId });
  }

  async purchaseHistoryForItem(
    organizationId: string,
    itemId: string,
    from?: Date,
    to?: Date,
  ) {
    const createdRange = dateRange(from, to);
    return PurchaseOrderModel.aggregate<VendorItemHistory>([
      {
        $match: {
          organizationId: new Types.ObjectId(organizationId),
          isDeleted: { $ne: true },
          status: {
            $nin: [PurchaseOrderStatus.CANCELLED, PurchaseOrderStatus.REJECTED],
          },
          ...(createdRange ? { createdAt: createdRange } : {}),
        },
      },
      { $unwind: "$items" },
      { $match: { "items.itemId": new Types.ObjectId(itemId) } },
      {
        $group: {
          _id: "$vendorId",
          avgUnitCost: { $avg: "$items.unitCost" },
          totalQuantity: { $sum: "$items.quantity" },
          totalAmount: { $sum: "$items.totalCost" },
          orderCount: { $sum: 1 },
          lastPurchaseAt: { $max: "$createdAt" },
        },
      },
      {
        $project: {
          _id: 0,
          vendorId: "$_id",
          avgUnitCost: 1,
          totalQuantity: 1,
          totalAmount: 1,
          orderCount: 1,
          lastPurchaseAt: 1,
        },
      },
    ]);
  }
}

export const procurementRepository = new ProcurementRepository();
