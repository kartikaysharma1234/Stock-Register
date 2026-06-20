import mongoose from "mongoose";
import { AuditModule } from "../constants";
import { config } from "../config";
import { AuditLogModel } from "../repository/schemas";

const migrate = async () => {
  await mongoose.connect(config.mongoUri);

  await AuditLogModel.updateMany(
    {},
    [
      {
        $set: {
          isDeleted: { $ifNull: ["$isDeleted", false] },
          module: {
            $ifNull: [
              "$module",
              {
                $switch: {
                  branches: [
                    {
                      case: {
                        $regexMatch: {
                          input: {
                            $concat: [
                              { $ifNull: ["$entityType", ""] },
                              " ",
                              { $ifNull: ["$action", ""] },
                            ],
                          },
                          regex: /asset/i,
                        },
                      },
                      then: AuditModule.ASSET,
                    },
                    {
                      case: {
                        $regexMatch: {
                          input: {
                            $concat: [
                              { $ifNull: ["$entityType", ""] },
                              " ",
                              { $ifNull: ["$action", ""] },
                            ],
                          },
                          regex: /purchase|vendor|payment|goodsreceived|grn/i,
                        },
                      },
                      then: AuditModule.PURCHASE,
                    },
                    {
                      case: {
                        $regexMatch: {
                          input: {
                            $concat: [
                              { $ifNull: ["$entityType", ""] },
                              " ",
                              { $ifNull: ["$action", ""] },
                            ],
                          },
                          regex: /request|department/i,
                        },
                      },
                      then: AuditModule.REQUEST,
                    },
                    {
                      case: {
                        $regexMatch: {
                          input: {
                            $concat: [
                              { $ifNull: ["$entityType", ""] },
                              " ",
                              { $ifNull: ["$action", ""] },
                            ],
                          },
                          regex: /user|role/i,
                        },
                      },
                      then: AuditModule.USER,
                    },
                    {
                      case: {
                        $regexMatch: {
                          input: {
                            $concat: [
                              { $ifNull: ["$entityType", ""] },
                              " ",
                              { $ifNull: ["$action", ""] },
                            ],
                          },
                          regex: /auth|login|password|invite/i,
                        },
                      },
                      then: AuditModule.AUTH,
                    },
                    {
                      case: {
                        $regexMatch: {
                          input: {
                            $concat: [
                              { $ifNull: ["$entityType", ""] },
                              " ",
                              { $ifNull: ["$action", ""] },
                            ],
                          },
                          regex: /organization|organisation/i,
                        },
                      },
                      then: AuditModule.ORGANIZATION,
                    },
                    {
                      case: {
                        $regexMatch: {
                          input: {
                            $concat: [
                              { $ifNull: ["$entityType", ""] },
                              " ",
                              { $ifNull: ["$action", ""] },
                            ],
                          },
                          regex: /billing|subscription|razorpay/i,
                        },
                      },
                      then: AuditModule.BILLING,
                    },
                    {
                      case: {
                        $regexMatch: {
                          input: {
                            $concat: [
                              { $ifNull: ["$entityType", ""] },
                              " ",
                              { $ifNull: ["$action", ""] },
                            ],
                          },
                          regex: /webhook/i,
                        },
                      },
                      then: AuditModule.WEBHOOK,
                    },
                    {
                      case: {
                        $regexMatch: {
                          input: {
                            $concat: [
                              { $ifNull: ["$entityType", ""] },
                              " ",
                              { $ifNull: ["$action", ""] },
                            ],
                          },
                          regex: /apikey|api_key|api key/i,
                        },
                      },
                      then: AuditModule.API_KEY,
                    },
                  ],
                  default: AuditModule.INVENTORY,
                },
              },
            ],
          },
        },
      },
    ],
  );

  await AuditLogModel.createIndexes();

  console.log("Module 8 audit migration completed.");
};

void migrate()
  .catch((error: unknown) => {
    console.error("Module 8 migration failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
