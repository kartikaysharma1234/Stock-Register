import { Schema, Types, model } from "mongoose";
import { ItemUnit, ValuationMethod } from "../../constants";

export interface IItemVariant {
  _id: Types.ObjectId;
  name: string;
  sku: string;
  barcode?: string;
  additionalCost: number;
}

export interface IBundleComponent {
  itemId: Types.ObjectId;
  quantity: number;
}

export interface IItem {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  sku: string;
  categoryId: Types.ObjectId;
  unit: ItemUnit;
  description?: string;
  barcode?: string;
  qrCode?: string;
  variants: IItemVariant[];
  isBundled: boolean;
  bundleComponents: IBundleComponent[];
  minStockThreshold: number;
  maxStockThreshold?: number;
  reorderPoint: number;
  reorderQuantity: number;
  valuationMethod: ValuationMethod;
  hsnCode?: string;
  gstRate: number;
  images: string[];
  isAsset: boolean;
  trackBatches: boolean;
  trackExpiry: boolean;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const variantSchema = new Schema<IItemVariant>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 80,
    },
    barcode: { type: String, trim: true, maxlength: 150 },
    additionalCost: { type: Number, default: 0 },
  },
);

const bundleComponentSchema = new Schema<IBundleComponent>(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    quantity: { type: Number, required: true, min: 0.000001 },
  },
  { _id: false },
);

const itemSchema = new Schema<IItem>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 80,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    unit: {
      type: String,
      enum: Object.values(ItemUnit),
      required: true,
    },
    description: { type: String, trim: true, maxlength: 1000 },
    barcode: { type: String, trim: true, maxlength: 150 },
    qrCode: { type: String, trim: true, maxlength: 500 },
    variants: { type: [variantSchema], default: [] },
    isBundled: { type: Boolean, default: false, index: true },
    bundleComponents: { type: [bundleComponentSchema], default: [] },
    minStockThreshold: { type: Number, default: 0, min: 0 },
    maxStockThreshold: { type: Number, min: 0 },
    reorderPoint: { type: Number, default: 0, min: 0 },
    reorderQuantity: { type: Number, default: 0, min: 0 },
    valuationMethod: {
      type: String,
      enum: Object.values(ValuationMethod),
      default: ValuationMethod.WEIGHTED_AVERAGE,
    },
    hsnCode: { type: String, trim: true, maxlength: 30 },
    gstRate: { type: Number, default: 0, min: 0, max: 100 },
    images: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    isAsset: { type: Boolean, default: false, index: true },
    trackBatches: { type: Boolean, default: false },
    trackExpiry: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

itemSchema.index({ organizationId: 1, sku: 1 }, { unique: true });
itemSchema.index(
  { organizationId: 1, barcode: 1 },
  { unique: true, sparse: true },
);
itemSchema.index(
  { organizationId: 1, "variants.sku": 1 },
  { unique: true, sparse: true },
);
itemSchema.index(
  { organizationId: 1, "variants.barcode": 1 },
  { unique: true, sparse: true },
);
itemSchema.index({ organizationId: 1, categoryId: 1, isDeleted: 1 });
itemSchema.index({ organizationId: 1, isActive: 1, isDeleted: 1 });
itemSchema.index({ organizationId: 1, createdAt: -1 });
itemSchema.index({
  name: "text",
  sku: "text",
  barcode: "text",
  qrCode: "text",
});

export const ItemModel = model<IItem>("Item", itemSchema);
