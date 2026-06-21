import Queue from "bull";
import { config } from "../config";
import { ReportFormat, ReportKind } from "../constants";

export interface ReportJobData {
  organizationId: string;
  requestedBy: string;
  recipientEmail?: string;
  recipients?: string[];
  savedReportId?: string;
  kind: ReportKind;
  format: ReportFormat;
  filters: {
    from?: string;
    to?: string;
    warehouseId?: string;
    departmentId?: string;
    itemId?: string;
    categoryId?: string;
    limit?: number;
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
