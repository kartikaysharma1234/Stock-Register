import { Schema, Types, model, models } from "mongoose";
import { Permission } from "../../constants";

export interface IRole {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  permissions: Permission[];
  isCustom: boolean;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
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
      maxlength: 80,
    },
    permissions: {
      type: [{ type: String, enum: Object.values(Permission) }],
      default: [],
    },
    isCustom: { type: Boolean, default: true, immutable: true },
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

roleSchema.index(
  { organizationId: 1, name: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
    partialFilterExpression: { isDeleted: false },
  },
);
roleSchema.index({ organizationId: 1, isActive: 1, isDeleted: 1 });

export const RoleModel =
  models.Role ?? model<IRole>("Role", roleSchema);
