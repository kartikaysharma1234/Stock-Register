import { Schema, model, Types } from "mongoose";
import { PurchaseOrderStatus } from "../../constants/status";

export interface IPurchaseOrderLine {
  itemId: Types.ObjectId;
  orderedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
  taxRate: number;
}

export interface IPurchaseOrder {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  poNumber: string;
  vendorId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  status: PurchaseOrderStatus;
  lines: IPurchaseOrderLine[];
  subtotal: number;
  taxTotal: number;
  total: number;
  expectedDeliveryDate?: Date;
  notes?: string;
  createdBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  rejectedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseOrderLineSchema = new Schema<IPurchaseOrderLine>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    orderedQuantity: { type: Number, required: true, min: 0.000001 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    poNumber: { type: String, required: true },
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
    lines: {
      type: [purchaseOrderLineSchema],
      required: true,
      validate: [(value: IPurchaseOrderLine[]) => value.length > 0, "Lines required"],
    },
    subtotal: { type: Number, required: true, min: 0 },
    taxTotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    expectedDeliveryDate: Date,
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    rejectionReason: String,
  },
  { timestamps: true },
);

purchaseOrderSchema.index(
  { organizationId: 1, poNumber: 1 },
  { unique: true },
);

export const PurchaseOrderModel = model<IPurchaseOrder>(
  "PurchaseOrder",
  purchaseOrderSchema,
);
