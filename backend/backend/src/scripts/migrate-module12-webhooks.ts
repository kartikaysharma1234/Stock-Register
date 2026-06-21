import mongoose from "mongoose";
import { config } from "../config";
import { WebhookDeliveryStatus } from "../constants";
import {
  WebhookDeliveryModel,
  WebhookEndpointModel,
} from "../repository/schemas";

const migrate = async () => {
  await mongoose.connect(config.mongoUri);

  await WebhookEndpointModel.updateMany(
    {},
    [
      {
        $set: {
          events: { $ifNull: ["$events", []] },
          headers: { $ifNull: ["$headers", {}] },
          isActive: { $ifNull: ["$isActive", true] },
          failureCount: { $ifNull: ["$failureCount", 0] },
          isDeleted: { $ifNull: ["$isDeleted", false] },
        },
      },
    ],
  );

  await WebhookDeliveryModel.updateMany(
    {},
    [
      {
        $set: {
          status: {
            $ifNull: ["$status", WebhookDeliveryStatus.PENDING],
          },
          attempt: { $ifNull: ["$attempt", 0] },
          maxAttempts: { $ifNull: ["$maxAttempts", 5] },
          requestHeaders: { $ifNull: ["$requestHeaders", {}] },
        },
      },
    ],
  );

  await Promise.all([
    WebhookEndpointModel.createIndexes(),
    WebhookDeliveryModel.createIndexes(),
  ]);

  console.log("Module 12 webhook migration completed.");
};

void migrate()
  .catch((error: unknown) => {
    console.error("Module 12 migration failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
