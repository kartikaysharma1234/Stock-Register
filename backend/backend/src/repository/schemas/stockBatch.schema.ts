import { Schema, model, Types } from "mongoose";

export interface IStockBatch {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  itemId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  batchNumber: string;
  quantity: number;
  receivedAt: Date;
  expiryDate?: Date;
  unitCost?: number;
  purchaseOrderId?: Types.ObjectId;
  grnId?: Types.ObjectId;
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
    batchNumber: { type: String, required: true, trim: true, uppercase: true },
    quantity: { type: Number, required: true, min: 0 },
    receivedAt: { type: Date, default: Date.now },
    expiryDate: { type: Date, index: true },
    unitCost: { type: Number, min: 0 },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },
    grnId: { type: Schema.Types.ObjectId, ref: "GoodsReceivedNote" },
  },
  { timestamps: true },
);

stockBatchSchema.index(
  { organizationId: 1, itemId: 1, warehouseId: 1, batchNumber: 1 },
  { unique: true },
);

export const StockBatchModel = model<IStockBatch>("StockBatch", stockBatchSchema);
