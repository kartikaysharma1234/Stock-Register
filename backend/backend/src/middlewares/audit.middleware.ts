import { RequestHandler } from "express";
import { auditService } from "../services/audit.service";
import { logger } from "../utils/logger";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const auditRequest: RequestHandler = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) return next();
  res.on("finish", () => {
    if (!req.user || res.statusCode >= 500) return;
    void auditService
      .record(
        {
          actorId: req.user.id,
          organizationId: req.user.organizationId,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        },
        {
          action: `http.${req.method.toLowerCase()}`,
          entityType: "HttpRequest",
          metadata: {
            path: req.originalUrl,
            statusCode: res.statusCode,
          },
        },
      )
      .catch((error) => logger.error("Failed to write audit log", { error }));
  });
  next();
};
