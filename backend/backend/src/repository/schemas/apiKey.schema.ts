import { Schema, Types, model } from "mongoose";
import { ApiKeyStatus, Permission } from "../../constants";

export interface IApiKey {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  description?: string;
  prefix: string;
  keyHash: string;
  keyLast4: string;
  scopes: Permission[];
  allowedIps: string[];
  status: ApiKeyStatus;
  expiresAt?: Date;
  lastUsedAt?: Date;
  lastUsedIp?: string;
  usageCount: number;
  createdBy: Types.ObjectId;
  rotatedAt?: Date;
  rotatedBy?: Types.ObjectId;
  revokedAt?: Date;
  revokedBy?: Types.ObjectId;
  revokeReason?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IApiKeyUsageLog {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  apiKeyId: Types.ObjectId;
  method: string;
  path: string;
  ipAddress?: string;
  statusCode?: number;
  userAgent?: string;
  createdAt: Date;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000 },
    prefix: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    keyLast4: { type: String, required: true, trim: true, maxlength: 4 },
    scopes: {
      type: [{ type: String, enum: Object.values(Permission) }],
      default: [],
    },
    allowedIps: {
      type: [{ type: String, trim: true, maxlength: 80 }],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(ApiKeyStatus),
      default: ApiKeyStatus.ACTIVE,
      index: true,
    },
    expiresAt: { type: Date, index: true },
    lastUsedAt: Date,
    lastUsedIp: { type: String, trim: true, maxlength: 80 },
    usageCount: { type: Number, default: 0, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rotatedAt: Date,
    rotatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    revokedAt: Date,
    revokedBy: { type: Schema.Types.ObjectId, ref: "User" },
    revokeReason: { type: String, trim: true, maxlength: 500 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

const apiKeyUsageLogSchema = new Schema<IApiKeyUsageLog>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    apiKeyId: {
      type: Schema.Types.ObjectId,
      ref: "ApiKey",
      required: true,
      index: true,
    },
    method: { type: String, required: true, trim: true, maxlength: 12 },
    path: { type: String, required: true, trim: true, maxlength: 1000 },
    ipAddress: { type: String, trim: true, maxlength: 80 },
    statusCode: { type: Number, min: 100, max: 599 },
    userAgent: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

apiKeySchema.index(
  { organizationId: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
apiKeySchema.index({ organizationId: 1, status: 1, isDeleted: 1 });
apiKeySchema.index({ organizationId: 1, createdAt: -1 });
apiKeySchema.index({ name: "text", description: "text", prefix: "text" });

apiKeyUsageLogSchema.index({ organizationId: 1, createdAt: -1 });
apiKeyUsageLogSchema.index({ apiKeyId: 1, createdAt: -1 });

export const ApiKeyModel = model<IApiKey>("ApiKey", apiKeySchema);

export const ApiKeyUsageLogModel = model<IApiKeyUsageLog>(
  "ApiKeyUsageLog",
  apiKeyUsageLogSchema,
);
