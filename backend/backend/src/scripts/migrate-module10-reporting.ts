import mongoose from "mongoose";
import { config } from "../config";
import { ReportFormat, ReportFrequency } from "../constants";
import { SavedReportModel } from "../repository/schemas";

const migrate = async () => {
  await mongoose.connect(config.mongoUri);

  await SavedReportModel.updateMany(
    {},
    [
      {
        $set: {
          filters: { $ifNull: ["$filters", {}] },
          columns: { $ifNull: ["$columns", []] },
          format: { $ifNull: ["$format", ReportFormat.XLSX] },
          frequency: { $ifNull: ["$frequency", ReportFrequency.NONE] },
          recipients: { $ifNull: ["$recipients", []] },
          isActive: { $ifNull: ["$isActive", true] },
          isDeleted: { $ifNull: ["$isDeleted", false] },
        },
      },
    ],
  );

  await SavedReportModel.createIndexes();

  console.log("Module 10 reporting migration completed.");
};

void migrate()
  .catch((error: unknown) => {
    console.error("Module 10 migration failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
