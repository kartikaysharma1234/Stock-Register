import { Schema, Types, model } from "mongoose";
import { GrnItemCondition } from "../../constants";

export interface IGoodsReceivedItem {
  itemId: Types.ObjectId;
  variantId?: Types.ObjectId;
  orderedQuantity: number;
  receivedQuantity: number;
  rejectedQuantity: number;
  batchNumber?: string;
  serialNumbers: string[];
  manufacturingDate?: Date;
  expiryDate?: Date;
  unitCost: number;
  condition: GrnItemCondition;
}

export interface IGoodsReceivedAttachment {
  name: string;
  url: string;
}

export interface IGoodsReceivedNote {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  grnNumber: string;
  purchaseOrderId: Types.ObjectId;
  vendorId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  receivedBy: Types.ObjectId;
  receivedAt: Date;
  items: IGoodsReceivedItem[];
  deliveryNoteNumber?: string;
  invoiceNumber?: string;
  invoiceDate?: Date;
  invoiceAmount?: number;
  qualityCheckPassed: boolean;
  qualityNotes?: string;
  notes?: string;
  attachments: IGoodsReceivedAttachment[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const goodsReceivedItemSchema = new Schema<IGoodsReceivedItem>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    variantId: { type: Schema.Types.ObjectId },
    orderedQuantity: { type: Number, required: true, min: 0 },
    receivedQuantity: {
      type: Number,
      required: true,
      min: 0,
      alias: "quantity",
    },
    rejectedQuantity: { type: Number, default: 0, min: 0 },
    batchNumber: { type: String, trim: true, uppercase: true },
    serialNumbers: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    manufacturingDate: Date,
    expiryDate: Date,
    unitCost: { type: Number, required: true, min: 0 },
    condition: {
      type: String,
      enum: Object.values(GrnItemCondition),
      default: GrnItemCondition.GOOD,
    },
  },
  { _id: false },
);

const goodsReceivedAttachmentSchema = new Schema<IGoodsReceivedAttachment>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    url: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { _id: false },
);

const goodsReceivedNoteSchema = new Schema<IGoodsReceivedNote>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      alias: "org",
      index: true,
    },
    grnNumber: { type: String, required: true, trim: true, uppercase: true },
    purchaseOrderId: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
      index: true,
    },
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
    receivedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receivedAt: { type: Date, default: Date.now },
    items: {
      type: [goodsReceivedItemSchema],
      alias: "lines",
      required: true,
      validate: [
        (value: IGoodsReceivedItem[]) => value.length > 0,
        "Items required",
      ],
    },
    deliveryNoteNumber: { type: String, trim: true, maxlength: 100 },
    invoiceNumber: { type: String, trim: true, maxlength: 100, index: true },
    invoiceDate: Date,
    invoiceAmount: { type: Number, min: 0 },
    qualityCheckPassed: { type: Boolean, default: true },
    qualityNotes: { type: String, trim: true, maxlength: 1000 },
    notes: { type: String, trim: true, maxlength: 1000 },
    attachments: { type: [goodsReceivedAttachmentSchema], default: [] },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

goodsReceivedNoteSchema.index(
  { organizationId: 1, grnNumber: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
goodsReceivedNoteSchema.index({ organizationId: 1, receivedAt: -1 });
goodsReceivedNoteSchema.index({ organizationId: 1, vendorId: 1, receivedAt: -1 });
goodsReceivedNoteSchema.index({
  organizationId: 1,
  warehouseId: 1,
  receivedAt: -1,
});

export const GoodsReceivedNoteModel = model<IGoodsReceivedNote>(
  "GoodsReceivedNote",
  goodsReceivedNoteSchema,
);
