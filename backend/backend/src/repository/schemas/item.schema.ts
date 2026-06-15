import { Schema, model, Types } from "mongoose";

export interface IItem {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  sku: string;
  categoryId: Types.ObjectId;
  unit: string;
  description?: string;
  barcode?: string;
  qrCode?: string;
  minStockThreshold: number;
  trackBatches: boolean;
  trackExpiry: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<IItem>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    unit: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    barcode: { type: String, trim: true },
    qrCode: { type: String, trim: true },
    minStockThreshold: { type: Number, default: 0, min: 0 },
    trackBatches: { type: Boolean, default: false },
    trackExpiry: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

itemSchema.index({ organizationId: 1, sku: 1 }, { unique: true });
itemSchema.index(
  { organizationId: 1, barcode: 1 },
  { unique: true, sparse: true },
);

export const ItemModel = model<IItem>("Item", itemSchema);
