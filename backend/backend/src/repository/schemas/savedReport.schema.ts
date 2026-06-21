import { Schema, Types, model } from "mongoose";
import { ReportFormat, ReportFrequency, ReportKind } from "../../constants";

export interface ISavedReport {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  description?: string;
  kind: ReportKind;
  filters: Record<string, unknown>;
  columns: string[];
  format: ReportFormat;
  frequency: ReportFrequency;
  recipients: string[];
  nextRunAt?: Date;
  lastRunAt?: Date;
  lastJobId?: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const savedReportSchema = new Schema<ISavedReport>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1000 },
    kind: {
      type: String,
      enum: Object.values(ReportKind),
      required: true,
      index: true,
    },
    filters: { type: Schema.Types.Mixed, default: {} },
    columns: {
      type: [{ type: String, trim: true, maxlength: 80 }],
      default: [],
    },
    format: {
      type: String,
      enum: Object.values(ReportFormat),
      default: ReportFormat.XLSX,
    },
    frequency: {
      type: String,
      enum: Object.values(ReportFrequency),
      default: ReportFrequency.NONE,
      index: true,
    },
    recipients: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: [],
    },
    nextRunAt: { type: Date, index: true },
    lastRunAt: Date,
    lastJobId: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

savedReportSchema.index(
  { organizationId: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
savedReportSchema.index({
  organizationId: 1,
  isActive: 1,
  frequency: 1,
  nextRunAt: 1,
  isDeleted: 1,
});

export const SavedReportModel = model<ISavedReport>(
  "SavedReport",
  savedReportSchema,
);
