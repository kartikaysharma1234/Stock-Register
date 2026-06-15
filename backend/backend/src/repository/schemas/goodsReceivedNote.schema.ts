import { Schema, model, Types } from "mongoose";

export interface IGoodsReceivedLine {
  itemId: Types.ObjectId;
  quantity: number;
  batchNumber?: string;
  expiryDate?: Date;
  unitCost?: number;
}

export interface IGoodsReceivedNote {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  grnNumber: string;
  purchaseOrderId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  lines: IGoodsReceivedLine[];
  receivedBy: Types.ObjectId;
  receivedAt: Date;
  deliveryNoteNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const goodsReceivedLineSchema = new Schema<IGoodsReceivedLine>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    quantity: { type: Number, required: true, min: 0.000001 },
    batchNumber: { type: String, trim: true, uppercase: true },
    expiryDate: Date,
    unitCost: { type: Number, min: 0 },
  },
  { _id: false },
);

const goodsReceivedNoteSchema = new Schema<IGoodsReceivedNote>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    grnNumber: { type: String, required: true },
    purchaseOrderId: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
      index: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    lines: { type: [goodsReceivedLineSchema], required: true },
    receivedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receivedAt: { type: Date, default: Date.now },
    deliveryNoteNumber: String,
    notes: String,
  },
  { timestamps: true },
);

goodsReceivedNoteSchema.index(
  { organizationId: 1, grnNumber: 1 },
  { unique: true },
);

export const GoodsReceivedNoteModel = model<IGoodsReceivedNote>(
  "GoodsReceivedNote",
  goodsReceivedNoteSchema,
);
