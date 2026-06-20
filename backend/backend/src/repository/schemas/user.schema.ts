import { Schema, Types, model, models } from "mongoose";
import { Permission, Role } from "../../constants";

export interface IUser {
  _id: Types.ObjectId;
  organizationId?: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: Role;
  customRoleId?: Types.ObjectId;
  permissions: Permission[];
  departmentId?: Types.ObjectId;
  warehouseId?: Types.ObjectId;
  departmentIds: Types.ObjectId[];
  warehouseIds: Types.ObjectId[];
  isActive: boolean;
  emailVerified: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationExpiresAt?: Date;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  invitationTokenHash?: string;
  invitationExpiresAt?: Date;
  invitedBy?: Types.ObjectId;
  lastLoginAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    phone: { type: String, trim: true, maxlength: 30 },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(Role),
      required: true,
      index: true,
    },
    customRoleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      index: true,
    },
    permissions: {
      type: [{ type: String, enum: Object.values(Permission) }],
      default: [],
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      index: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      index: true,
    },
    departmentIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Department" }],
      default: [],
    },
    warehouseIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Warehouse" }],
      default: [],
    },
    isActive: { type: Boolean, default: true, index: true },
    emailVerified: { type: Boolean, default: false, index: true },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    invitationTokenHash: { type: String, select: false },
    invitationExpiresAt: { type: Date, select: false },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
    lastLoginAt: Date,
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        const sanitized = ret as Record<string, unknown>;
        delete sanitized.passwordHash;
        delete sanitized.emailVerificationTokenHash;
        delete sanitized.passwordResetTokenHash;
        delete sanitized.invitationTokenHash;
        return ret;
      },
    },
  },
);

userSchema.index({ organizationId: 1, role: 1, isDeleted: 1 });
userSchema.index({ organizationId: 1, isActive: 1, isDeleted: 1 });
userSchema.index({ organizationId: 1, departmentIds: 1, isDeleted: 1 });
userSchema.index({ organizationId: 1, warehouseIds: 1, isDeleted: 1 });
userSchema.index({ name: "text", email: "text" });

export const UserModel =
  models.User ?? model<IUser>("User", userSchema);
