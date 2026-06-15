import { Schema, model, Types } from "mongoose";
import { StockMovementType } from "../../constants/status";

export interface IStockMovement {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  itemId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  departmentId?: Types.ObjectId;
  batchId?: Types.ObjectId;
  type: StockMovementType;
  quantity: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: Types.ObjectId;
  notes?: string;
  performedBy: Types.ObjectId;
  occurredAt: Date;
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
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true, index: true },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", index: true },
    batchId: { type: Schema.Types.ObjectId, ref: "StockBatch" },
    type: {
      type: String,
      enum: Object.values(StockMovementType),
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true, min: 0 },
    referenceType: String,
    referenceId: Schema.Types.ObjectId,
    notes: String,
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    occurredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

stockMovementSchema.index({ organizationId: 1, occurredAt: -1 });

export const StockMovementModel = model<IStockMovement>(
  "StockMovement",
  stockMovementSchema,
);
