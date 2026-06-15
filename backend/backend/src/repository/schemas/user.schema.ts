import { Schema, model, Types } from "mongoose";
import { Role } from "../../constants/roles";

export interface IUser {
  _id: Types.ObjectId;
  organizationId?: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  departmentIds: Types.ObjectId[];
  warehouseIds: Types.ObjectId[];
  isActive: boolean;
  emailVerified: boolean;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  invitationTokenHash?: string;
  invitationExpiresAt?: Date;
  lastLoginAt?: Date;
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
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(Role), required: true },
    departmentIds: [{ type: Schema.Types.ObjectId, ref: "Department" }],
    warehouseIds: [{ type: Schema.Types.ObjectId, ref: "Warehouse" }],
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    invitationTokenHash: { type: String, select: false },
    invitationExpiresAt: { type: Date, select: false },
    lastLoginAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const sanitized = ret as Record<string, unknown>;
        delete sanitized.passwordHash;
        delete sanitized.passwordResetTokenHash;
        delete sanitized.invitationTokenHash;
        return ret;
      },
    },
  },
);

export const UserModel = model<IUser>("User", userSchema);
