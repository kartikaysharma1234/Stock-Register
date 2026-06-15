import { auditRepository } from "../repository/audit.repository";
import { AuditContext } from "../types/auth";

export class AuditService {
  record(
    context: AuditContext,
    data: {
      action: string;
      entityType: string;
      entityId?: string;
      before?: unknown;
      after?: unknown;
      metadata?: Record<string, unknown>;
    },
  ) {
    return auditRepository.create({
      organizationId: context.organizationId?.toString(),
      actorId: context.actorId?.toString(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      ...data,
    });
  }

  list(
    organizationId: string | undefined,
    filter: Parameters<typeof auditRepository.list>[1],
  ) {
    return auditRepository.list(organizationId, filter);
  }
}

export const auditService = new AuditService();
