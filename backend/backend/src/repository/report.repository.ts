import { Types } from "mongoose";
import { StockMovementType } from "../constants/status";
import { InventoryBalanceModel, StockMovementModel } from "./schemas";

export class ReportRepository {
  stockMovementSummary(
    organizationId: string,
    from: Date,
    to: Date,
    warehouseId?: string,
  ) {
    return StockMovementModel.aggregate([
      {
        $match: {
          organizationId: new Types.ObjectId(organizationId),
          occurredAt: { $gte: from, $lte: to },
          ...(warehouseId
            ? { warehouseId: new Types.ObjectId(warehouseId) }
            : {}),
        },
      },
      {
        $group: {
          _id: { itemId: "$itemId", type: "$type" },
          quantity: { $sum: "$quantity" },
          movements: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "items",
          localField: "_id.itemId",
          foreignField: "_id",
          as: "item",
        },
      },
      { $unwind: "$item" },
      {
        $project: {
          _id: 0,
          itemId: "$_id.itemId",
          type: "$_id.type",
          itemName: "$item.name",
          sku: "$item.sku",
          quantity: 1,
          movements: 1,
        },
      },
      { $sort: { itemName: 1, type: 1 } },
    ]);
  }

  departmentConsumption(organizationId: string, from: Date, to: Date) {
    return StockMovementModel.aggregate([
      {
        $match: {
          organizationId: new Types.ObjectId(organizationId),
          type: StockMovementType.OUTFLOW,
          departmentId: { $exists: true },
          occurredAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: { departmentId: "$departmentId", itemId: "$itemId" },
          quantity: { $sum: "$quantity" },
        },
      },
      {
        $lookup: {
          from: "departments",
          localField: "_id.departmentId",
          foreignField: "_id",
          as: "department",
        },
      },
      {
        $lookup: {
          from: "items",
          localField: "_id.itemId",
          foreignField: "_id",
          as: "item",
        },
      },
      { $unwind: "$department" },
      { $unwind: "$item" },
      {
        $project: {
          _id: 0,
          departmentId: "$_id.departmentId",
          departmentName: "$department.name",
          itemId: "$_id.itemId",
          itemName: "$item.name",
          sku: "$item.sku",
          quantity: 1,
        },
      },
      { $sort: { departmentName: 1, itemName: 1 } },
    ]);
  }

  stockStatus(organizationId: string) {
    return InventoryBalanceModel.aggregate([
      { $match: { organizationId: new Types.ObjectId(organizationId) } },
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
        $lookup: {
          from: "warehouses",
          localField: "warehouseId",
          foreignField: "_id",
          as: "warehouse",
        },
      },
      { $unwind: "$warehouse" },
      {
        $addFields: {
          threshold: {
            $ifNull: ["$minStockThreshold", "$item.minStockThreshold"],
          },
        },
      },
      {
        $addFields: {
          status: {
            $switch: {
              branches: [
                { case: { $eq: ["$quantity", 0] }, then: "out_of_stock" },
                {
                  case: { $lte: ["$quantity", "$threshold"] },
                  then: "low_stock",
                },
              ],
              default: "in_stock",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          itemId: 1,
          itemName: "$item.name",
          sku: "$item.sku",
          warehouseId: 1,
          warehouseName: "$warehouse.name",
          quantity: 1,
          threshold: 1,
          status: 1,
        },
      },
      { $sort: { status: 1, quantity: 1 } },
    ]);
  }
}

export const reportRepository = new ReportRepository();
