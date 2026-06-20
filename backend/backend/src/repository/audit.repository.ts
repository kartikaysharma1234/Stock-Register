import { FilterQuery } from "mongoose";
import { AuditModule, SortOrder } from "../constants";
import { AuditLogModel, IAuditLog } from "./schemas";

export interface AuditCreateRecord {
  organizationId?: string;
  actorId?: string;
  action: string;
  module: AuditModule;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditListFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder | "asc" | "desc";
  actorId?: string;
  performedBy?: string;
  action?: string;
  module?: AuditModule;
  entityType?: string;
  resourceType?: string;
  entityId?: string;
  resourceId?: string;
  from?: Date;
  to?: Date;
  search?: string;
}

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const pageValues = (filter: AuditListFilter) => ({
  page: filter.page ?? 1,
  limit: filter.limit ?? 25,
});

const sort = (
  filter: AuditListFilter,
  fallback: string,
): Record<string, 1 | -1> => ({
  [filter.sortBy ?? fallback]: filter.sortOrder === SortOrder.ASC ? 1 : -1,
});

const pagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

const buildQuery = (
  organizationId: string | undefined,
  filter: AuditListFilter,
): FilterQuery<IAuditLog> => {
  const query: FilterQuery<IAuditLog> = {
    isDeleted: { $ne: true },
    ...(organizationId ? { organizationId } : {}),
  };
  const actorId = filter.actorId ?? filter.performedBy;
  const entityType = filter.entityType ?? filter.resourceType;
  const entityId = filter.entityId ?? filter.resourceId;
  if (actorId) query.actorId = actorId;
  if (filter.action) query.action = filter.action;
  if (filter.module) query.module = filter.module;
  if (entityType) query.entityType = entityType;
  if (entityId) query.entityId = entityId;
  if (filter.from || filter.to) {
    query.createdAt = {
      ...(filter.from ? { $gte: filter.from } : {}),
      ...(filter.to ? { $lte: filter.to } : {}),
    };
  }
  if (filter.search) {
    const search = escapeRegex(filter.search);
    query.$or = [
      { action: { $regex: search, $options: "i" } },
      { entityType: { $regex: search, $options: "i" } },
      { ipAddress: { $regex: search, $options: "i" } },
    ];
  }
  return query;
};

export class AuditRepository {
  create(data: AuditCreateRecord) {
    return AuditLogModel.create(data);
  }

  async list(
    organizationId: string | undefined,
    filter: AuditListFilter = {},
  ) {
    const { page, limit } = pageValues(filter);
    const query = buildQuery(organizationId, filter);
    const [logs, total] = await Promise.all([
      AuditLogModel.find(query)
        .populate("actorId", "name email role")
        .sort(sort(filter, "createdAt"))
        .skip((page - 1) * limit)
        .limit(limit),
      AuditLogModel.countDocuments(query),
    ]);
    return { logs, pagination: pagination(page, limit, total) };
  }

  resourceHistory(
    organizationId: string | undefined,
    resourceId: string,
    filter: AuditListFilter = {},
  ) {
    return this.list(organizationId, { ...filter, entityId: resourceId });
  }

  exportRows(
    organizationId: string | undefined,
    filter: AuditListFilter = {},
    maxRows = 5000,
  ) {
    return AuditLogModel.find(buildQuery(organizationId, filter))
      .populate("actorId", "name email role")
      .sort(sort(filter, "createdAt"))
      .limit(maxRows);
  }
}

export const auditRepository = new AuditRepository();
