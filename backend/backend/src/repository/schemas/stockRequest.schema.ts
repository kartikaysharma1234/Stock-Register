import { Schema, Types, model } from "mongoose";
import {
  RequestAction,
  RequestPriority,
  RequestStatus,
  Role,
} from "../../constants";

export interface IStockRequestLine {
  _id: Types.ObjectId;
  itemId: Types.ObjectId;
  variantId?: Types.ObjectId;
  requestedQuantity: number;
  approvedQuantity: number;
  fulfilledQuantity: number;
  unitCost: number;
  notes?: string;
  rejectionReason?: string;
}

export interface IRequestApprovalHistory {
  action: RequestAction;
  performedBy: Types.ObjectId;
  role: Role;
  comments?: string;
  timestamp: Date;
}

export interface IStockRequest {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  requestNumber: string;
  requestedBy: Types.ObjectId;
  departmentId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  status: RequestStatus;
  lines: IStockRequestLine[];
  priority: RequestPriority;
  requiredByDate?: Date;
  purpose?: string;
  approvalHistory: IRequestApprovalHistory[];
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  fulfilledBy?: Types.ObjectId;
  fulfilledAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  cancelledBy?: Types.ObjectId;
  cancelledAt?: Date;
  stockReserved: boolean;
  budgetCommittedAmount: number;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const stockRequestLineSchema = new Schema<IStockRequestLine>(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "Item",
      required: true,
      index: true,
    },
    variantId: Schema.Types.ObjectId,
    requestedQuantity: {
      type: Number,
      required: true,
      min: 0.000001,
      alias: "quantity",
    },
    approvedQuantity: { type: Number, default: 0, min: 0 },
    fulfilledQuantity: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true, maxlength: 500 },
    rejectionReason: { type: String, trim: true, maxlength: 1000 },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const approvalHistorySchema = new Schema<IRequestApprovalHistory>(
  {
    action: {
      type: String,
      enum: Object.values(RequestAction),
      required: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: [...new Set(Object.values(Role))],
      required: true,
    },
    comments: { type: String, trim: true, maxlength: 1000 },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const stockRequestSchema = new Schema<IStockRequest>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    requestNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(RequestStatus),
      default: RequestStatus.DRAFT,
      index: true,
    },
    lines: {
      type: [stockRequestLineSchema],
      alias: "items",
      required: true,
      validate: [
        (value: IStockRequestLine[]) => value.length > 0,
        "Items required",
      ],
    },
    priority: {
      type: String,
      enum: Object.values(RequestPriority),
      default: RequestPriority.MEDIUM,
      index: true,
    },
    requiredByDate: { type: Date, index: true },
    purpose: {
      type: String,
      trim: true,
      maxlength: 2000,
      alias: "notes",
    },
    approvalHistory: {
      type: [approvalHistorySchema],
      default: [],
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    fulfilledBy: { type: Schema.Types.ObjectId, ref: "User" },
    fulfilledAt: Date,
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedAt: Date,
    rejectionReason: { type: String, trim: true, maxlength: 1000 },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
    cancelledAt: Date,
    stockReserved: { type: Boolean, default: false, index: true },
    budgetCommittedAmount: { type: Number, default: 0, min: 0 },
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

stockRequestSchema.index(
  { organizationId: 1, requestNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);
stockRequestSchema.index({
  organizationId: 1,
  status: 1,
  createdAt: -1,
  isDeleted: 1,
});
stockRequestSchema.index({
  organizationId: 1,
  departmentId: 1,
  createdAt: -1,
});
stockRequestSchema.index({
  organizationId: 1,
  warehouseId: 1,
  createdAt: -1,
});
stockRequestSchema.index({
  organizationId: 1,
  requestedBy: 1,
  createdAt: -1,
});
stockRequestSchema.index({ requestNumber: "text", purpose: "text" });

export const StockRequestModel = model<IStockRequest>(
  "StockRequest",
  stockRequestSchema,
);
