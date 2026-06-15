import Queue from "bull";
import { config } from "../config";

export type ReportKind =
  | "stock-movement"
  | "department-consumption"
  | "stock-status";

export interface ReportJobData {
  organizationId: string;
  requestedBy: string;
  recipientEmail: string;
  kind: ReportKind;
  format: "xlsx" | "pdf";
  filters: {
    from?: string;
    to?: string;
    warehouseId?: string;
  };
}

export const reportQueue = new Queue<ReportJobData>(
  "inventory-reports",
  config.redisUrl,
  {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 10000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  },
);
