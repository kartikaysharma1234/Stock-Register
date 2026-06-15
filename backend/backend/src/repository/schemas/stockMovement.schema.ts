import { Schema, Types, model } from "mongoose";
import {
  StockMovementType,
  StockReferenceType,
} from "../../constants";

export interface IStockMovement {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  itemId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  zoneId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  batchId?: Types.ObjectId;
  type: StockMovementType;
  quantity: number;
  balanceAfter: number;
  costPerUnit: number;
  totalCost: number;
  referenceType?: StockReferenceType | string;
  referenceId?: Types.ObjectId;
  serialNumbers: string[];
  performedBy: Types.ObjectId;
  notes?: string;
  occurredAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const stockMovementSchema = new Schema<IStockMovement>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "Item",
      required: true,
      index: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    zoneId: {
      type: Schema.Types.ObjectId,
      ref: "WarehouseZone",
      index: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      index: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "StockBatch",
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(StockMovementType),
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true, min: 0 },
    costPerUnit: { type: Number, default: 0, min: 0 },
    totalCost: { type: Number, default: 0, min: 0 },
    referenceType: {
      type: String,
      enum: Object.values(StockReferenceType),
      index: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    serialNumbers: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    notes: { type: String, trim: true, maxlength: 1000 },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    occurredAt: { type: Date, default: Date.now, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

stockMovementSchema.index({
  organizationId: 1,
  occurredAt: -1,
  isDeleted: 1,
});
stockMovementSchema.index({
  organizationId: 1,
  itemId: 1,
  occurredAt: -1,
});
stockMovementSchema.index({
  organizationId: 1,
  warehouseId: 1,
  occurredAt: -1,
});

export const StockMovementModel = model<IStockMovement>(
  "StockMovement",
  stockMovementSchema,
);
