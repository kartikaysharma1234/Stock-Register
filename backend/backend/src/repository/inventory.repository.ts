import { ClientSession, FilterQuery, Types } from "mongoose";
import { StockMovementType } from "../constants/status";
import {
  IInventoryBalance,
  InventoryBalanceModel,
  ItemModel,
  StockBatchModel,
  StockMovementModel,
} from "./schemas";

export interface ItemListFilter {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
}

export class InventoryRepository {
  createItem(organizationId: string, data: Record<string, unknown>) {
    return ItemModel.create({ ...data, organizationId });
  }

  findItem(organizationId: string, id: string) {
    return ItemModel.findOne({ _id: id, organizationId });
  }

  findItemBySku(organizationId: string, sku: string) {
    return ItemModel.findOne({ organizationId, sku: sku.toUpperCase() });
  }

  listItems(organizationId: string, filter: ItemListFilter = {}) {
    const query: FilterQuery<unknown> = { organizationId };
    if (filter.categoryId) query.categoryId = filter.categoryId;
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: "i" } },
        { sku: { $regex: filter.search, $options: "i" } },
        { barcode: filter.search },
        { qrCode: filter.search },
      ];
    }
    return ItemModel.find(query)
      .populate("categoryId", "name code")
      .sort({ name: 1 });
  }

  updateItem(
    organizationId: string,
    id: string,
    data: Record<string, unknown>,
  ) {
    return ItemModel.findOneAndUpdate({ _id: id, organizationId }, data, {
      new: true,
      runValidators: true,
    });
  }

  archiveItem(organizationId: string, id: string) {
    return ItemModel.findOneAndUpdate(
      { _id: id, organizationId },
      { isActive: false },
      { new: true },
    );
  }

  findBalance(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    session?: ClientSession,
  ) {
    return InventoryBalanceModel.findOne({
      organizationId,
      itemId,
      warehouseId,
    }).session(session ?? null);
  }

  incrementBalance(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    quantity: number,
    session?: ClientSession,
  ) {
    return InventoryBalanceModel.findOneAndUpdate(
      { organizationId, itemId, warehouseId },
      {
        $inc: { quantity },
        $setOnInsert: { reservedQuantity: 0 },
      },
      { new: true, upsert: true, session, runValidators: true },
    );
  }

  decrementBalance(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    quantity: number,
    session?: ClientSession,
  ) {
    return InventoryBalanceModel.findOneAndUpdate(
      {
        organizationId,
        itemId,
        warehouseId,
        quantity: { $gte: quantity },
      },
      { $inc: { quantity: -quantity } },
      { new: true, session, runValidators: true },
    );
  }

  listBalances(organizationId: string, warehouseId?: string) {
    const filter: FilterQuery<IInventoryBalance> = { organizationId };
    if (warehouseId) filter.warehouseId = warehouseId;
    return InventoryBalanceModel.find(filter)
      .populate("itemId", "name sku unit minStockThreshold barcode")
      .populate("warehouseId", "name code")
      .sort({ updatedAt: -1 });
  }

  listLowStock(organizationId: string, warehouseId?: string) {
    const match: Record<string, unknown> = {
      organizationId: new Types.ObjectId(organizationId),
    };
    if (warehouseId) match.warehouseId = new Types.ObjectId(warehouseId);
    return InventoryBalanceModel.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "items",
          localField: "itemId",
          foreignField: "_id",
          as: "item",
        },
      },
      { $unwind: "$item" },
      {
        $addFields: {
          effectiveThreshold: {
            $ifNull: ["$minStockThreshold", "$item.minStockThreshold"],
          },
        },
      },
      {
        $match: {
          $expr: { $lte: ["$quantity", "$effectiveThreshold"] },
        },
      },
      {
        $lookup: {
          from: "warehouses",
          localField: "warehouseId",
          foreignField: "_id",
          as: "warehouse",
        },
      },
      { $unwind: "$warehouse" },
      { $sort: { quantity: 1 } },
    ]);
  }

  upsertBatch(
    data: {
      organizationId: string;
      itemId: string;
      warehouseId: string;
      batchNumber: string;
      quantity: number;
      receivedAt?: Date;
      expiryDate?: Date;
      unitCost?: number;
      purchaseOrderId?: string;
      grnId?: string;
    },
    session?: ClientSession,
  ) {
    const { quantity, ...batch } = data;
    return StockBatchModel.findOneAndUpdate(
      {
        organizationId: data.organizationId,
        itemId: data.itemId,
        warehouseId: data.warehouseId,
        batchNumber: data.batchNumber.toUpperCase(),
      },
      {
        $inc: { quantity },
        $setOnInsert: batch,
      },
      { new: true, upsert: true, session, runValidators: true },
    );
  }

  findAvailableBatches(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    session?: ClientSession,
  ) {
    return StockBatchModel.find({
      organizationId,
      itemId,
      warehouseId,
      quantity: { $gt: 0 },
      $or: [{ expiryDate: { $exists: false } }, { expiryDate: { $gt: new Date() } }],
    })
      .sort({ expiryDate: 1, receivedAt: 1 })
      .session(session ?? null);
  }

  decrementBatch(id: string, quantity: number, session?: ClientSession) {
    return StockBatchModel.findOneAndUpdate(
      { _id: id, quantity: { $gte: quantity } },
      { $inc: { quantity: -quantity } },
      { new: true, session, runValidators: true },
    );
  }

  createMovement(
    data: {
      organizationId: string;
      itemId: string;
      warehouseId: string;
      departmentId?: string;
      batchId?: string;
      type: StockMovementType;
      quantity: number;
      balanceAfter: number;
      referenceType?: string;
      referenceId?: string;
      notes?: string;
      performedBy: string;
      occurredAt?: Date;
    },
    session?: ClientSession,
  ) {
    return StockMovementModel.create([data], { session }).then(([movement]) => movement);
  }

  listMovements(
    organizationId: string,
    filter: {
      itemId?: string;
      warehouseId?: string;
      departmentId?: string;
      type?: StockMovementType;
      from?: Date;
      to?: Date;
    },
  ) {
    const query: Record<string, unknown> = { organizationId };
    if (filter.itemId) query.itemId = filter.itemId;
    if (filter.warehouseId) query.warehouseId = filter.warehouseId;
    if (filter.departmentId) query.departmentId = filter.departmentId;
    if (filter.type) query.type = filter.type;
    if (filter.from || filter.to) {
      query.occurredAt = {
        ...(filter.from ? { $gte: filter.from } : {}),
        ...(filter.to ? { $lte: filter.to } : {}),
      };
    }
    return StockMovementModel.find(query)
      .populate("itemId", "name sku unit")
      .populate("warehouseId", "name code")
      .populate("departmentId", "name code")
      .populate("performedBy", "name email")
      .sort({ occurredAt: -1 });
  }
}

export const inventoryRepository = new InventoryRepository();
