import { Schema, Types, model } from "mongoose";

export interface IWarehouseZone {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const warehouseZoneSchema = new Schema<IWarehouseZone>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
    },
    description: { type: String, trim: true, maxlength: 500 },
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

warehouseZoneSchema.index(
  { organizationId: 1, warehouseId: 1, code: 1 },
  { unique: true },
);
warehouseZoneSchema.index({
  organizationId: 1,
  warehouseId: 1,
  isActive: 1,
  isDeleted: 1,
});
warehouseZoneSchema.index({ organizationId: 1, createdAt: -1 });
warehouseZoneSchema.index({ name: "text", code: "text" });

export const WarehouseZoneModel = model<IWarehouseZone>(
  "WarehouseZone",
  warehouseZoneSchema,
);
