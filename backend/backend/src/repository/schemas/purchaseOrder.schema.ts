import { Schema, Types, model } from "mongoose";
import { PurchaseOrderStatus } from "../../constants";

export interface IPurchaseOrderItem {
  itemId: Types.ObjectId;
  variantId?: Types.ObjectId;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  taxRate: number;
  totalCost: number;
  expectedDeliveryDate?: Date;
  notes?: string;
}

export interface IPurchaseOrderAttachment {
  name: string;
  url: string;
}

export interface IPurchaseOrder {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  poNumber: string;
  vendorId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  status: PurchaseOrderStatus;
  items: IPurchaseOrderItem[];
  subTotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  expectedDeliveryDate?: Date;
  notes?: string;
  attachments: IPurchaseOrderAttachment[];
  createdBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  sentToVendorAt?: Date;
  cancelledBy?: Types.ObjectId;
  cancelledAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  cancellationReason?: string;
  vendorStatsCounted: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseOrderItemSchema = new Schema<IPurchaseOrderItem>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    variantId: { type: Schema.Types.ObjectId },
    quantity: {
      type: Number,
      required: true,
      min: 0.000001,
      alias: "orderedQuantity",
    },
    receivedQuantity: { type: Number, default: 0, min: 0 },
    unitCost: {
      type: Number,
      required: true,
      min: 0,
      alias: "unitPrice",
    },
    taxRate: { type: Number, default: 0, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    expectedDeliveryDate: Date,
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false },
);

const purchaseOrderAttachmentSchema = new Schema<IPurchaseOrderAttachment>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    url: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { _id: false },
);

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      alias: "org",
      index: true,
    },
    poNumber: { type: String, required: true, trim: true, uppercase: true },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(PurchaseOrderStatus),
      default: PurchaseOrderStatus.DRAFT,
      index: true,
    },
    items: {
      type: [purchaseOrderItemSchema],
      alias: "lines",
      required: true,
      validate: [
        (value: IPurchaseOrderItem[]) => value.length > 0,
        "Items required",
      ],
    },
    subTotal: { type: Number, required: true, min: 0, alias: "subtotal" },
    taxAmount: { type: Number, required: true, min: 0, alias: "taxTotal" },
    discountAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0, alias: "total" },
    expectedDeliveryDate: Date,
    notes: { type: String, trim: true, maxlength: 1000 },
    attachments: { type: [purchaseOrderAttachmentSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    sentToVendorAt: Date,
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
    cancelledAt: Date,
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedAt: Date,
    rejectionReason: { type: String, trim: true, maxlength: 1000 },
    cancellationReason: { type: String, trim: true, maxlength: 1000 },
    vendorStatsCounted: { type: Boolean, default: false, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

purchaseOrderSchema.index(
  { organizationId: 1, poNumber: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
purchaseOrderSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
purchaseOrderSchema.index({ organizationId: 1, vendorId: 1, createdAt: -1 });
purchaseOrderSchema.index({ organizationId: 1, warehouseId: 1, status: 1 });

export const PurchaseOrderModel = model<IPurchaseOrder>(
  "PurchaseOrder",
  purchaseOrderSchema,
);
