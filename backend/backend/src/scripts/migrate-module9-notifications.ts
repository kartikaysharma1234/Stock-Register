import mongoose from "mongoose";
import { config } from "../config";
import { NotificationChannel } from "../constants";
import {
  ItemModel,
  NotificationModel,
  NotificationPreferenceModel,
} from "../repository/schemas";

const migrate = async () => {
  await mongoose.connect(config.mongoUri);

  await NotificationModel.updateMany(
    {},
    [
      {
        $set: {
          channels: {
            $let: {
              vars: {
                currentChannels: {
                  $cond: [{ $isArray: "$channels" }, "$channels", []],
                },
              },
              in: {
                $cond: [
                  { $gt: [{ $size: "$$currentChannels" }, 0] },
                  "$$currentChannels",
                  [NotificationChannel.IN_APP],
                ],
              },
            },
          },
          isRead: {
            $ifNull: [
              "$isRead",
              { $cond: [{ $ifNull: ["$readAt", false] }, true, false] },
            ],
          },
          isDeleted: { $ifNull: ["$isDeleted", false] },
        },
      },
    ],
  );

  await NotificationPreferenceModel.updateMany(
    {},
    [
      {
        $set: {
          preferences: { $ifNull: ["$preferences", []] },
          isDeleted: { $ifNull: ["$isDeleted", false] },
        },
      },
    ],
  );

  await Promise.all([
    ItemModel.createIndexes(),
    NotificationModel.createIndexes(),
    NotificationPreferenceModel.createIndexes(),
  ]);

  console.log("Module 9 notification migration completed.");
};

void migrate()
  .catch((error: unknown) => {
    console.error("Module 9 migration failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
