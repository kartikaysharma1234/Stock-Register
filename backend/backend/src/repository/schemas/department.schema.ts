import { Schema, Types, model } from "mongoose";
import { BudgetPeriod } from "../../constants";

export interface IDepartment {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  headUserId?: Types.ObjectId;
  budgetAllocated: number;
  budgetCommitted: number;
  budgetUsed: number;
  budgetPeriod: BudgetPeriod;
  budgetPeriodStartedAt?: Date;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
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
    description: { type: String, trim: true, maxlength: 500 },
    headUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      alias: "headId",
    },
    budgetAllocated: { type: Number, default: 0, min: 0 },
    budgetCommitted: { type: Number, default: 0, min: 0 },
    budgetUsed: { type: Number, default: 0, min: 0 },
    budgetPeriod: {
      type: String,
      enum: Object.values(BudgetPeriod),
      default: BudgetPeriod.YEARLY,
      index: true,
    },
    budgetPeriodStartedAt: Date,
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

departmentSchema.index(
  { organizationId: 1, code: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);
departmentSchema.index({
  organizationId: 1,
  isActive: 1,
  isDeleted: 1,
});
departmentSchema.index({ organizationId: 1, createdAt: -1 });
departmentSchema.index({ name: "text", code: "text", description: "text" });

export const DepartmentModel = model<IDepartment>(
  "Department",
  departmentSchema,
);
