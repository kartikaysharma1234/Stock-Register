import { Schema, model, Types } from "mongoose";
import { RequestStatus } from "../../constants/status";

export interface IStockRequestLine {
  itemId: Types.ObjectId;
  requestedQuantity: number;
  fulfilledQuantity: number;
  notes?: string;
}

export interface IStockRequest {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  requestNumber: string;
  departmentId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  requestedBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  fulfilledBy?: Types.ObjectId;
  rejectedBy?: Types.ObjectId;
  status: RequestStatus;
  lines: IStockRequestLine[];
  purpose?: string;
  rejectionReason?: string;
  approvedAt?: Date;
  fulfilledAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const stockRequestLineSchema = new Schema<IStockRequestLine>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    requestedQuantity: { type: Number, required: true, min: 0.000001 },
    fulfilledQuantity: { type: Number, default: 0, min: 0 },
    notes: String,
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
    requestNumber: { type: String, required: true },
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
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    fulfilledBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: Object.values(RequestStatus),
      default: RequestStatus.PENDING,
      index: true,
    },
    lines: {
      type: [stockRequestLineSchema],
      required: true,
      validate: [(value: IStockRequestLine[]) => value.length > 0, "Lines required"],
    },
    purpose: String,
    rejectionReason: String,
    approvedAt: Date,
    fulfilledAt: Date,
    rejectedAt: Date,
  },
  { timestamps: true },
);

stockRequestSchema.index(
  { organizationId: 1, requestNumber: 1 },
  { unique: true },
);

export const StockRequestModel = model<IStockRequest>(
  "StockRequest",
  stockRequestSchema,
);
