import { AuditLogModel } from "./schemas";

export class AuditRepository {
  create(data: {
    organizationId?: string;
    actorId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return AuditLogModel.create(data);
  }

  list(
    organizationId: string | undefined,
    filter: {
      actorId?: string;
      action?: string;
      entityType?: string;
      from?: Date;
      to?: Date;
    },
  ) {
    const query: Record<string, unknown> = {
      ...(organizationId ? { organizationId } : {}),
    };
    if (filter.actorId) query.actorId = filter.actorId;
    if (filter.action) query.action = filter.action;
    if (filter.entityType) query.entityType = filter.entityType;
    if (filter.from || filter.to) {
      query.createdAt = {
        ...(filter.from ? { $gte: filter.from } : {}),
        ...(filter.to ? { $lte: filter.to } : {}),
      };
    }
    return AuditLogModel.find(query)
      .populate("actorId", "name email role")
      .sort({ createdAt: -1 });
  }
}

export const auditRepository = new AuditRepository();
