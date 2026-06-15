import { Schema, Types, model } from "mongoose";
import { WarehouseType } from "../../constants";

export interface IWarehouseAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface IWarehouse {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  code: string;
  type: WarehouseType;
  address?: IWarehouseAddress;
  managerId?: Types.ObjectId;
  contactPhone?: string;
  location?: string;
  managerUserIds: Types.ObjectId[];
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const warehouseAddressSchema = new Schema<IWarehouseAddress>(
  {
    line1: { type: String, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200 },
    city: { type: String, trim: true, maxlength: 100 },
    state: { type: String, trim: true, maxlength: 100 },
    pincode: { type: String, trim: true, maxlength: 20 },
  },
  { _id: false },
);

const warehouseSchema = new Schema<IWarehouse>(
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
      maxlength: 150,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
    },
    type: {
      type: String,
      enum: Object.values(WarehouseType),
      default: WarehouseType.SECONDARY,
      index: true,
    },
    address: warehouseAddressSchema,
    managerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    contactPhone: { type: String, trim: true, maxlength: 30 },
    // Compatibility fields for records created by the earlier master-data API.
    location: { type: String, trim: true, maxlength: 300 },
    managerUserIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
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

warehouseSchema.index({ organizationId: 1, code: 1 }, { unique: true });
warehouseSchema.index({
  organizationId: 1,
  isActive: 1,
  isDeleted: 1,
});
warehouseSchema.index({ organizationId: 1, type: 1, isDeleted: 1 });
warehouseSchema.index({ organizationId: 1, "address.city": 1 });
warehouseSchema.index({ organizationId: 1, createdAt: -1 });
warehouseSchema.index({ name: "text", code: "text", location: "text" });

export const WarehouseModel = model<IWarehouse>(
  "Warehouse",
  warehouseSchema,
);
