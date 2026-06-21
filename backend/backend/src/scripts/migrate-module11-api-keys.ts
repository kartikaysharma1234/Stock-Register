import mongoose from "mongoose";
import { config } from "../config";
import { ApiKeyStatus } from "../constants";
import { ApiKeyModel, ApiKeyUsageLogModel } from "../repository/schemas";

const migrate = async () => {
  await mongoose.connect(config.mongoUri);

  await ApiKeyModel.updateMany(
    {},
    [
      {
        $set: {
          scopes: { $ifNull: ["$scopes", []] },
          allowedIps: { $ifNull: ["$allowedIps", []] },
          status: { $ifNull: ["$status", ApiKeyStatus.ACTIVE] },
          usageCount: { $ifNull: ["$usageCount", 0] },
          isDeleted: { $ifNull: ["$isDeleted", false] },
        },
      },
    ],
  );

  await Promise.all([
    ApiKeyModel.createIndexes(),
    ApiKeyUsageLogModel.createIndexes(),
  ]);

  console.log("Module 11 API key migration completed.");
};

void migrate()
  .catch((error: unknown) => {
    console.error("Module 11 migration failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
