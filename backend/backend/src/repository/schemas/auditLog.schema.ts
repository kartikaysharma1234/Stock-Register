import { Schema, Types, model } from "mongoose";
import { AuditModule } from "../../constants";

export interface IAuditLog {
  _id: Types.ObjectId;
  organizationId?: Types.ObjectId;
  actorId?: Types.ObjectId;
  performedBy?: Types.ObjectId;
  action: string;
  module: AuditModule;
  entityType: string;
  resourceType: string;
  entityId?: Types.ObjectId;
  resourceId?: Types.ObjectId;
  before?: unknown;
  previousValue?: unknown;
  after?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      alias: "performedBy",
      index: true,
    },
    action: { type: String, required: true, trim: true, maxlength: 150, index: true },
    module: {
      type: String,
      enum: Object.values(AuditModule),
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
      alias: "resourceType",
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      alias: "resourceId",
      index: true,
    },
    before: { type: Schema.Types.Mixed, alias: "previousValue" },
    after: { type: Schema.Types.Mixed, alias: "newValue" },
    metadata: Schema.Types.Mixed,
    ipAddress: { type: String, trim: true, maxlength: 100 },
    userAgent: { type: String, trim: true, maxlength: 500 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

auditLogSchema.index({ organizationId: 1, createdAt: -1, isDeleted: 1 });
auditLogSchema.index({ organizationId: 1, module: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: "text", entityType: "text" });

export const AuditLogModel = model<IAuditLog>("AuditLog", auditLogSchema);
