import { RequestHandler, Response } from "express";
import { AuditModule } from "../constants";
import { auditService, inferAuditModule } from "../services/audit.service";
import { logger } from "../utils/logger";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const objectIdPattern = /^[a-f\d]{24}$/i;
const sensitiveKeys = new Set([
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "secret",
  "key",
  "apiKey",
]);

const resourceTypeMap: Readonly<Record<string, string>> = {
  assets: "Asset",
  "audit-logs": "AuditLog",
  categories: "Category",
  departments: "Department",
  grn: "GoodsReceivedNote",
  inventory: "Inventory",
  items: "Item",
  notifications: "Notification",
  organizations: "Organization",
  organisations: "Organization",
  payments: "Payment",
  procurement: "Procurement",
  "purchase-orders": "PurchaseOrder",
  reports: "Report",
  requests: "StockRequest",
  roles: "Role",
  stock: "StockMovement",
  users: "User",
  vendors: "Vendor",
  warehouses: "Warehouse",
  webhooks: "Webhook",
};

const sanitize = (value: unknown, depth = 0): unknown => {
  if (depth > 5) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (Buffer.isBuffer(value)) return `[buffer:${value.length}]`;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    return value.length > 5000 ? `${value.slice(0, 5000)}...[truncated]` : value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((entry) => sanitize(entry, depth + 1));
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      sensitiveKeys.has(key) ? "[redacted]" : sanitize(entry, depth + 1),
    ]),
  );
};

const pathSegments = (originalUrl: string) =>
  originalUrl
    .split("?")[0]
    .replace(/^\/api\/v\d+\//, "")
    .split("/")
    .filter(Boolean);

const resourceTypeFromPath = (segments: string[]) => {
  const [first, second] = segments;
  if (first === "procurement" && second) {
    return resourceTypeMap[second] ?? "Procurement";
  }
  return resourceTypeMap[first ?? ""] ?? "HttpRequest";
};

const resourceIdFromPath = (segments: string[]) =>
  segments.find((segment) => objectIdPattern.test(segment));

const moduleForRequest = (resourceType: string) => {
  const module = inferAuditModule(resourceType);
  return resourceType === "AuditLog" ? AuditModule.AUDIT : module;
};

const wrapResponse = (res: Response) => {
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  let responseBody: unknown;

  res.json = ((body: unknown) => {
    responseBody = body;
    return originalJson(body);
  }) as Response["json"];

  res.send = ((body?: unknown) => {
    if (responseBody === undefined) responseBody = body;
    return originalSend(body);
  }) as Response["send"];

  return () => responseBody;
};

export const auditRequest: RequestHandler = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) return next();
  const responseBody = wrapResponse(res);
  res.on("finish", () => {
    if (!req.user || res.statusCode >= 500) return;
    const segments = pathSegments(req.originalUrl);
    const resourceType = resourceTypeFromPath(segments);
    const resourceId = resourceIdFromPath(segments);
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
          module: moduleForRequest(resourceType),
          entityType: resourceType,
          entityId: resourceId,
          before: sanitize(req.body),
          after: sanitize(responseBody()),
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
