import { Schema, model, Types } from "mongoose";

export interface IInventoryBalance {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  itemId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  quantity: number;
  reservedQuantity: number;
  minStockThreshold?: number;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryBalanceSchema = new Schema<IInventoryBalance>(
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
    quantity: { type: Number, default: 0, min: 0 },
    reservedQuantity: { type: Number, default: 0, min: 0 },
    minStockThreshold: { type: Number, min: 0 },
  },
  { timestamps: true },
);

inventoryBalanceSchema.index(
  { organizationId: 1, itemId: 1, warehouseId: 1 },
  { unique: true },
);

export const InventoryBalanceModel = model<IInventoryBalance>(
  "InventoryBalance",
  inventoryBalanceSchema,
);
