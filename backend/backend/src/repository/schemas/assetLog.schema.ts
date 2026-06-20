import { Schema, Types, model } from "mongoose";
import { AssetAction } from "../../constants";

export interface IAssetLog {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  assetId: Types.ObjectId;
  action: AssetAction;
  performedBy: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  notes?: string;
  cost?: number;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const assetLogSchema = new Schema<IAssetLog>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      alias: "org",
      index: true,
    },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(AssetAction),
      required: true,
      index: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    notes: { type: String, trim: true, maxlength: 2000 },
    cost: { type: Number, min: 0 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

assetLogSchema.index({ organizationId: 1, assetId: 1, createdAt: -1 });
assetLogSchema.index({ organizationId: 1, action: 1, createdAt: -1 });

export const AssetLogModel = model<IAssetLog>("AssetLog", assetLogSchema);
