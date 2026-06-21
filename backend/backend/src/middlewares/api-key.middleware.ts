import { NextFunction, Request, Response } from "express";
import { apiKeyService } from "../services/apiKey.service";
import { ApiError } from "../utils/api-error";

const apiKeyHeader = (req: Request) => {
  const header = req.header("x-api-key");
  if (header) return header.trim();
  const authorization = req.header("authorization");
  if (!authorization) return undefined;
  const [scheme, value] = authorization.split(" ");
  return scheme.toLowerCase() === "apikey" ? value : undefined;
};

export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rawKey = apiKeyHeader(req);
    if (!rawKey) throw new ApiError(401, "API key is required");
    const result = await apiKeyService.authenticateKey(rawKey, req.ip);
    req.user = result.actor;
    req.apiKey = {
      id: result.apiKey.id,
      organizationId: result.apiKey.organizationId,
      prefix: result.apiKey.prefix,
    };
    res.on("finish", () => {
      void apiKeyService.recordUsage({
        organizationId: result.apiKey.organizationId,
        apiKeyId: result.apiKey.id,
        method: req.method,
        path: req.originalUrl,
        ipAddress: req.ip,
        statusCode: res.statusCode,
        userAgent: req.get("user-agent"),
      }).catch(() => undefined);
    });
    return next();
  } catch (error) {
    return next(error);
  }
};
