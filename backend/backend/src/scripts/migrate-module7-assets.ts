import mongoose from "mongoose";
import { AssetStatus, DepreciationMethod } from "../constants";
import { config } from "../config";
import { AssetLogModel, AssetModel, CounterModel } from "../repository/schemas";

const assetIndexKey = JSON.stringify({ organizationId: 1, assetTag: 1 });

interface CollectionIndex {
  key: Record<string, 1 | -1 | string>;
  name?: string;
  partialFilterExpression?: Record<string, unknown>;
}

const dropLegacyIndex = async (
  indexes: CollectionIndex[],
  key: string,
  drop: (name: string) => Promise<unknown>,
) => {
  const index = indexes.find(
    (entry) =>
      JSON.stringify(entry.key) === key &&
      !entry.partialFilterExpression,
  );
  if (index?.name) await drop(index.name);
};

const migrate = async () => {
  await mongoose.connect(config.mongoUri);

  await AssetModel.updateMany(
    {},
    [
      {
        $set: {
          purchaseCost: { $ifNull: ["$purchaseCost", 0] },
          currentValue: {
            $ifNull: [
              "$currentValue",
              { $ifNull: ["$purchaseCost", 0] },
            ],
          },
          depreciationMethod: {
            $ifNull: [
              "$depreciationMethod",
              DepreciationMethod.STRAIGHT_LINE,
            ],
          },
          depreciationRate: { $ifNull: ["$depreciationRate", 0] },
          usefulLifeYears: { $ifNull: ["$usefulLifeYears", 0] },
          maintenanceSchedule: { $ifNull: ["$maintenanceSchedule", []] },
          attachments: { $ifNull: ["$attachments", []] },
          status: { $ifNull: ["$status", AssetStatus.AVAILABLE] },
          isDeleted: { $ifNull: ["$isDeleted", false] },
        },
      },
    ],
  );

  await AssetLogModel.updateMany(
    {},
    [
      {
        $set: {
          isDeleted: { $ifNull: ["$isDeleted", false] },
        },
      },
    ],
  );

  await dropLegacyIndex(
    (await AssetModel.collection.indexes()) as CollectionIndex[],
    assetIndexKey,
    (name) => AssetModel.collection.dropIndex(name),
  );

  await Promise.all([
    CounterModel.createIndexes(),
    AssetModel.createIndexes(),
    AssetLogModel.createIndexes(),
  ]);

  console.log("Module 7 asset migration completed.");
};

void migrate()
  .catch((error: unknown) => {
    console.error("Module 7 migration failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
