import Queue from "bull";
import { config } from "../config";

export type AlertJobName =
  | "lowStockAlertJob"
  | "expiryAlertJob"
  | "assetMaintenanceJob"
  | "budgetAlertJob"
  | "autoReorderJob"
  | "reportSchedulerJob";

export interface AlertJobData {
  organizationId?: string;
  days?: number;
}

export interface WhatsappJobData {
  notificationId?: string;
  to: string;
  message: string;
}

export const alertQueue = new Queue<AlertJobData>(
  "inventory-alerts",
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

export const whatsappQueue = new Queue<WhatsappJobData>(
  "inventory-whatsapp",
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

export const scheduleAlertJobs = () =>
  Promise.all([
    alertQueue.add(
      "lowStockAlertJob",
      {},
      { repeat: { cron: "0 */6 * * *" }, jobId: "low-stock-alert" },
    ),
    alertQueue.add(
      "expiryAlertJob",
      { days: 30 },
      { repeat: { cron: "0 2 * * *" }, jobId: "expiry-alert" },
    ),
    alertQueue.add(
      "assetMaintenanceJob",
      {},
      { repeat: { cron: "0 3 * * *" }, jobId: "asset-maintenance-alert" },
    ),
    alertQueue.add(
      "budgetAlertJob",
      {},
      { repeat: { cron: "30 3 * * *" }, jobId: "budget-alert" },
    ),
    alertQueue.add(
      "autoReorderJob",
      {},
      { repeat: { cron: "15 */6 * * *" }, jobId: "auto-reorder" },
    ),
    alertQueue.add(
      "reportSchedulerJob",
      {},
      { repeat: { cron: "15 * * * *" }, jobId: "report-scheduler" },
    ),
  ]);
