import { Schema, Types, model } from "mongoose";
import { AssetStatus, DepreciationMethod } from "../../constants";

export interface IAssetMaintenanceSchedule {
  type: string;
  intervalDays: number;
  lastDone?: Date;
  nextDue?: Date;
}

export interface IAsset {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  assetTag: string;
  itemId: Types.ObjectId;
  name: string;
  serialNumber?: string;
  barcode?: string;
  category?: string;
  warehouseId: Types.ObjectId;
  zoneId?: Types.ObjectId;
  status: AssetStatus;
  assignedTo?: Types.ObjectId;
  assignedAt?: Date;
  expectedReturnDate?: Date;
  purchaseDate?: Date;
  purchaseCost: number;
  currentValue: number;
  depreciationMethod: DepreciationMethod;
  depreciationRate: number;
  usefulLifeYears: number;
  warrantyExpiry?: Date;
  insuranceExpiry?: Date;
  maintenanceSchedule: IAssetMaintenanceSchedule[];
  notes?: string;
  attachments: string[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const assetMaintenanceScheduleSchema = new Schema<IAssetMaintenanceSchedule>(
  {
    type: { type: String, required: true, trim: true, maxlength: 120 },
    intervalDays: { type: Number, required: true, min: 1 },
    lastDone: Date,
    nextDue: { type: Date, index: true },
  },
  { _id: false },
);

const assetSchema = new Schema<IAsset>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      alias: "org",
      index: true,
    },
    assetTag: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "Item",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    serialNumber: { type: String, trim: true, uppercase: true, maxlength: 120 },
    barcode: { type: String, trim: true, maxlength: 150 },
    category: { type: String, trim: true, maxlength: 150, index: true },
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
    status: {
      type: String,
      enum: Object.values(AssetStatus),
      default: AssetStatus.AVAILABLE,
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    assignedAt: Date,
    expectedReturnDate: Date,
    purchaseDate: Date,
    purchaseCost: { type: Number, default: 0, min: 0 },
    currentValue: { type: Number, default: 0, min: 0 },
    depreciationMethod: {
      type: String,
      enum: Object.values(DepreciationMethod),
      default: DepreciationMethod.STRAIGHT_LINE,
    },
    depreciationRate: { type: Number, default: 0, min: 0, max: 100 },
    usefulLifeYears: { type: Number, default: 0, min: 0 },
    warrantyExpiry: { type: Date, index: true },
    insuranceExpiry: { type: Date, index: true },
    maintenanceSchedule: {
      type: [assetMaintenanceScheduleSchema],
      default: [],
    },
    notes: { type: String, trim: true, maxlength: 2000 },
    attachments: {
      type: [{ type: String, trim: true, maxlength: 1000 }],
      default: [],
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

assetSchema.index(
  { organizationId: 1, assetTag: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
assetSchema.index(
  { organizationId: 1, serialNumber: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { isDeleted: false },
  },
);
assetSchema.index(
  { organizationId: 1, barcode: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { isDeleted: false },
  },
);
assetSchema.index({ organizationId: 1, status: 1, isDeleted: 1 });
assetSchema.index({ organizationId: 1, warehouseId: 1, status: 1 });
assetSchema.index({ organizationId: 1, assignedTo: 1, status: 1 });
assetSchema.index({
  organizationId: 1,
  "maintenanceSchedule.nextDue": 1,
  status: 1,
});
assetSchema.index({ name: "text", assetTag: "text", serialNumber: "text", barcode: "text" });

export const AssetModel = model<IAsset>("Asset", assetSchema);
