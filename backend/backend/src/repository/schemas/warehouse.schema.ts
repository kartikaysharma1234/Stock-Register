import { Schema, model, Types } from "mongoose";

export interface IWarehouse {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  code: string;
  location?: string;
  managerUserIds: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const warehouseSchema = new Schema<IWarehouse>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    location: { type: String, trim: true },
    managerUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

warehouseSchema.index({ organizationId: 1, code: 1 }, { unique: true });

export const WarehouseModel = model<IWarehouse>("Warehouse", warehouseSchema);
