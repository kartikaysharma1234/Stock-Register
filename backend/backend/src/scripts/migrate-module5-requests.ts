import mongoose from "mongoose";
import { config } from "../config";
import {
  CounterModel,
  DepartmentModel,
  StockRequestModel,
} from "../repository/schemas";

const departmentIndexKey = JSON.stringify({
  organizationId: 1,
  code: 1,
});

const requestIndexKey = JSON.stringify({
  organizationId: 1,
  requestNumber: 1,
});

const dropLegacyIndex = async (
  indexes: Awaited<ReturnType<typeof DepartmentModel.collection.indexes>>,
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

  await Promise.all([
    DepartmentModel.updateMany(
      {},
      [
        {
          $set: {
            budgetAllocated: { $ifNull: ["$budgetAllocated", 0] },
            budgetCommitted: { $ifNull: ["$budgetCommitted", 0] },
            budgetUsed: { $ifNull: ["$budgetUsed", 0] },
            budgetPeriod: { $ifNull: ["$budgetPeriod", "yearly"] },
            isActive: { $ifNull: ["$isActive", true] },
            isDeleted: { $ifNull: ["$isDeleted", false] },
          },
        },
      ],
    ),
    StockRequestModel.updateMany(
      {},
      [
        {
          $set: {
            priority: { $ifNull: ["$priority", "medium"] },
            approvalHistory: { $ifNull: ["$approvalHistory", []] },
            stockReserved: { $ifNull: ["$stockReserved", false] },
            budgetCommittedAmount: {
              $ifNull: ["$budgetCommittedAmount", 0],
            },
            isDeleted: { $ifNull: ["$isDeleted", false] },
            lines: {
              $map: {
                input: { $ifNull: ["$lines", []] },
                as: "line",
                in: {
                  $mergeObjects: [
                    "$$line",
                    {
                      approvedQuantity: {
                        $ifNull: ["$$line.approvedQuantity", 0],
                      },
                      fulfilledQuantity: {
                        $ifNull: ["$$line.fulfilledQuantity", 0],
                      },
                      unitCost: {
                        $ifNull: ["$$line.unitCost", 0],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      ],
    ),
  ]);

  await dropLegacyIndex(
    await DepartmentModel.collection.indexes(),
    departmentIndexKey,
    (name) => DepartmentModel.collection.dropIndex(name),
  );
  await dropLegacyIndex(
    await StockRequestModel.collection.indexes(),
    requestIndexKey,
    (name) => StockRequestModel.collection.dropIndex(name),
  );

  await Promise.all([
    CounterModel.createIndexes(),
    DepartmentModel.createIndexes(),
    StockRequestModel.createIndexes(),
  ]);

  console.log("Module 5 department and request migration completed.");
};

void migrate()
  .catch((error: unknown) => {
    console.error("Module 5 migration failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
