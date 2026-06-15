import mongoose from "mongoose";
import { config } from "../config";
import {
  CategoryModel,
  InventoryBalanceModel,
  ItemModel,
  StockBatchModel,
  StockMovementModel,
} from "../repository/schemas";

const legacyBalanceIndex = JSON.stringify({
  organizationId: 1,
  itemId: 1,
  warehouseId: 1,
});

const legacyBatchIndex = JSON.stringify({
  organizationId: 1,
  itemId: 1,
  warehouseId: 1,
  batchNumber: 1,
});

const dropIndexByKey = async (
  indexes: Awaited<ReturnType<typeof InventoryBalanceModel.collection.indexes>>,
  expectedKey: string,
  drop: (name: string) => Promise<unknown>,
) => {
  const index = indexes.find(
    (entry) => JSON.stringify(entry.key) === expectedKey,
  );
  if (index?.name) await drop(index.name);
};

const migrate = async () => {
  await mongoose.connect(config.mongoUri);

  await Promise.all([
    CategoryModel.updateMany(
      { isDeleted: { $exists: false } },
      { $set: { isDeleted: false } },
    ),
    ItemModel.updateMany(
      {},
      [
        {
          $set: {
            variants: { $ifNull: ["$variants", []] },
            isBundled: { $ifNull: ["$isBundled", false] },
            bundleComponents: { $ifNull: ["$bundleComponents", []] },
            reorderPoint: { $ifNull: ["$reorderPoint", 0] },
            reorderQuantity: { $ifNull: ["$reorderQuantity", 0] },
            valuationMethod: {
              $ifNull: ["$valuationMethod", "weighted_average"],
            },
            gstRate: { $ifNull: ["$gstRate", 0] },
            images: { $ifNull: ["$images", []] },
            isAsset: { $ifNull: ["$isAsset", false] },
            trackBatches: { $ifNull: ["$trackBatches", false] },
            trackExpiry: { $ifNull: ["$trackExpiry", false] },
            isDeleted: { $ifNull: ["$isDeleted", false] },
          },
        },
      ],
    ),
    InventoryBalanceModel.updateMany(
      {},
      [
        {
          $set: {
            reservedQuantity: { $ifNull: ["$reservedQuantity", 0] },
            availableQuantity: {
              $ifNull: [
                "$availableQuantity",
                {
                  $subtract: [
                    { $ifNull: ["$quantity", 0] },
                    { $ifNull: ["$reservedQuantity", 0] },
                  ],
                },
              ],
            },
            averageCost: { $ifNull: ["$averageCost", 0] },
            totalValue: {
              $ifNull: [
                "$totalValue",
                {
                  $multiply: [
                    { $ifNull: ["$quantity", 0] },
                    { $ifNull: ["$averageCost", 0] },
                  ],
                },
              ],
            },
            isDeleted: { $ifNull: ["$isDeleted", false] },
          },
        },
      ],
    ),
    StockBatchModel.updateMany(
      {},
      [
        {
          $set: {
            serialNumbers: { $ifNull: ["$serialNumbers", []] },
            receivedQuantity: {
              $ifNull: ["$receivedQuantity", "$quantity"],
            },
            remainingQuantity: {
              $ifNull: ["$remainingQuantity", "$quantity"],
            },
            quantity: {
              $ifNull: ["$quantity", "$remainingQuantity"],
            },
            unitCost: { $ifNull: ["$unitCost", "$costPerUnit"] },
            costPerUnit: { $ifNull: ["$costPerUnit", "$unitCost"] },
            isDeleted: { $ifNull: ["$isDeleted", false] },
          },
        },
      ],
    ),
    StockMovementModel.updateMany(
      {},
      [
        {
          $set: {
            costPerUnit: { $ifNull: ["$costPerUnit", 0] },
            totalCost: {
              $ifNull: [
                "$totalCost",
                {
                  $multiply: [
                    { $ifNull: ["$quantity", 0] },
                    { $ifNull: ["$costPerUnit", 0] },
                  ],
                },
              ],
            },
            serialNumbers: { $ifNull: ["$serialNumbers", []] },
            occurredAt: { $ifNull: ["$occurredAt", "$createdAt"] },
            isDeleted: { $ifNull: ["$isDeleted", false] },
          },
        },
      ],
    ),
  ]);

  await dropIndexByKey(
    await InventoryBalanceModel.collection.indexes(),
    legacyBalanceIndex,
    (name) => InventoryBalanceModel.collection.dropIndex(name),
  );
  await dropIndexByKey(
    await StockBatchModel.collection.indexes(),
    legacyBatchIndex,
    (name) => StockBatchModel.collection.dropIndex(name),
  );

  await Promise.all([
    CategoryModel.createIndexes(),
    ItemModel.createIndexes(),
    InventoryBalanceModel.createIndexes(),
    StockBatchModel.createIndexes(),
    StockMovementModel.createIndexes(),
  ]);

  console.log("Module 4 inventory migration completed.");
};

void migrate()
  .catch((error: unknown) => {
    console.error("Module 4 inventory migration failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
