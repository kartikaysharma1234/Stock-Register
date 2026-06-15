import Queue from "bull";
import { config } from "../config";

export interface NotificationJobData {
  notificationId?: string;
  to: string;
  subject: string;
  template: string;
  variables: Record<string, string | number>;
}

export const notificationQueue = new Queue<NotificationJobData>(
  "inventory-notifications",
  config.redisUrl,
  {
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  },
);
