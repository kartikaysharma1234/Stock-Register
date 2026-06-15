import { Schema, Types, model } from "mongoose";

export interface IInventoryBalance {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  itemId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  zoneId?: Types.ObjectId;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  averageCost: number;
  totalValue: number;
  minStockThreshold?: number;
  lastMovementAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
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
    zoneId: {
      type: Schema.Types.ObjectId,
      ref: "WarehouseZone",
      index: true,
    },
    quantity: { type: Number, default: 0, min: 0 },
    reservedQuantity: { type: Number, default: 0, min: 0 },
    availableQuantity: { type: Number, default: 0, min: 0 },
    averageCost: { type: Number, default: 0, min: 0 },
    totalValue: { type: Number, default: 0, min: 0 },
    minStockThreshold: { type: Number, min: 0 },
    lastMovementAt: { type: Date, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

inventoryBalanceSchema.index(
  {
    organizationId: 1,
    itemId: 1,
    warehouseId: 1,
    zoneId: 1,
  },
  { unique: true },
);
inventoryBalanceSchema.index({
  organizationId: 1,
  warehouseId: 1,
  isDeleted: 1,
});
inventoryBalanceSchema.index({ organizationId: 1, lastMovementAt: 1 });
inventoryBalanceSchema.index({ organizationId: 1, updatedAt: -1 });

export const InventoryBalanceModel = model<IInventoryBalance>(
  "InventoryBalance",
  inventoryBalanceSchema,
);

export const StockModel = InventoryBalanceModel;
