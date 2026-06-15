import { Schema, Types, model } from "mongoose";

export interface IStockBatch {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  itemId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  zoneId?: Types.ObjectId;
  batchNumber: string;
  serialNumbers: string[];
  receivedQuantity: number;
  quantity: number;
  remainingQuantity: number;
  manufacturingDate?: Date;
  receivedAt: Date;
  expiryDate?: Date;
  unitCost?: number;
  costPerUnit?: number;
  purchaseOrderId?: Types.ObjectId;
  grnId?: Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const stockBatchSchema = new Schema<IStockBatch>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "Item",
      required: true,
      index: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    zoneId: {
      type: Schema.Types.ObjectId,
      ref: "WarehouseZone",
      index: true,
    },
    batchNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 100,
    },
    serialNumbers: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    receivedQuantity: { type: Number, required: true, min: 0 },
    // quantity is retained for compatibility and mirrors remainingQuantity.
    quantity: { type: Number, required: true, min: 0 },
    remainingQuantity: { type: Number, required: true, min: 0 },
    manufacturingDate: Date,
    receivedAt: { type: Date, default: Date.now, index: true },
    expiryDate: { type: Date, index: true },
    unitCost: { type: Number, min: 0 },
    costPerUnit: { type: Number, min: 0 },
    purchaseOrderId: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      index: true,
    },
    grnId: {
      type: Schema.Types.ObjectId,
      ref: "GoodsReceivedNote",
      index: true,
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

stockBatchSchema.index(
  {
    organizationId: 1,
    itemId: 1,
    warehouseId: 1,
    zoneId: 1,
    batchNumber: 1,
  },
  { unique: true },
);
stockBatchSchema.index({
  organizationId: 1,
  expiryDate: 1,
  remainingQuantity: 1,
  isDeleted: 1,
});
stockBatchSchema.index({ organizationId: 1, createdAt: -1 });
stockBatchSchema.index(
  { organizationId: 1, serialNumbers: 1 },
  { unique: true, sparse: true },
);

export const StockBatchModel = model<IStockBatch>(
  "StockBatch",
  stockBatchSchema,
);
