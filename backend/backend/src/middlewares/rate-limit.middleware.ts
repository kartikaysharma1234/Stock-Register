import { NextFunction, Request, Response } from "express";
import { redisClient } from "../caches/redis.cache";
import { ApiError } from "../utils/api-error";
import { logger } from "../utils/logger";

export const planRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const organization = req.organization;
  if (!organization) return next();
  const limit = organization.planLimits.requestsPerMinute;
  if (limit === null) return next();

  const minuteBucket = Math.floor(Date.now() / 60_000);
  const key = `rate-limit:organization:${organization.id}:${minuteBucket}`;
  try {
    const count = await redisClient.incr(key);
    if (count === 1) await redisClient.expire(key, 60);
    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - count));
    if (count > limit) {
      res.setHeader("Retry-After", 60);
      return next(new ApiError(429, "Organization rate limit exceeded"));
    }
  } catch (error) {
    logger.warn("Plan rate limiter is unavailable; request allowed", { error });
  }
  return next();
};
