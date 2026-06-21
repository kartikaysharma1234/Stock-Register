import http from "http";
import mongoose from "mongoose";
import { createApp } from "./app";
import { redisClient } from "./caches/redis.cache";
import { config } from "./config";
import { alertQueue, whatsappQueue } from "./queue/alert.queue";
import { notificationQueue } from "./queue/notification.queue";
import { reportQueue } from "./queue/report.queue";
import { webhookQueue } from "./queue/webhook.queue";
import { logger } from "./utils/logger";

const start = async () => {
  await mongoose.connect(config.mongoUri);
  if (redisClient.status === "wait") {
    await redisClient.connect();
  }
  const server = http.createServer(createApp());
  server.listen(config.port, () => {
    logger.info("Stock Register API started", {
      port: config.port,
      environment: config.nodeEnv,
    });
  });

  const shutdown = async (signal: string) => {
    logger.info("Shutting down", { signal });
    server.close(async () => {
      await Promise.all([
        mongoose.disconnect(),
        redisClient.quit(),
        notificationQueue.close(),
        reportQueue.close(),
        alertQueue.close(),
        whatsappQueue.close(),
        webhookQueue.close(),
      ]);
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
};

start().catch((error) => {
  logger.error("Failed to start server", { error });
  process.exit(1);
});
