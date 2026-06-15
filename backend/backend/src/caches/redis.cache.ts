import Redis from "ioredis";
import { config } from "../config";
import { logger } from "../utils/logger";

export const redisClient = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 2,
  lazyConnect: true,
});

redisClient.on("error", (error) => {
  logger.error("Redis error", { error });
});

export const redisCache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redisClient.get(key);
    return value ? (JSON.parse(value) as T) : null;
  },
  async set(key: string, value: unknown, ttlSeconds: number) {
    await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
  },
  async del(key: string) {
    await redisClient.del(key);
  },
};
