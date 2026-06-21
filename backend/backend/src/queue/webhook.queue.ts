import Queue from "bull";
import { config } from "../config";
import { WebhookEvent } from "../constants";

export interface WebhookDeliveryJobData {
  deliveryId: string;
  webhookId: string;
  organizationId: string;
  event: WebhookEvent;
}

export const webhookQueue = new Queue<WebhookDeliveryJobData>(
  "inventory-webhooks",
  config.redisUrl,
  {
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  },
);
