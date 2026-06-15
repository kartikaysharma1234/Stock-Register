import { BudgetPeriod, Role } from "../constants";
import {
  DepartmentCreateRecord,
  DepartmentListFilter,
  departmentRepository,
} from "../repository/department.repository";
import { RequestListFilter, requestRepository } from "../repository/request.repository";
import { userRepository } from "../repository/user.repository";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { auditService } from "./audit.service";

export interface DepartmentInput {
  organizationId?: string;
  name: string;
  code: string;
  description?: string;
  headId?: string | null;
  headUserId?: string | null;
  budgetAllocated?: number;
  budgetPeriod?: BudgetPeriod;
  budgetPeriodStartedAt?: Date;
  isActive?: boolean;
}

const scopedDepartmentRoles = new Set<Role>([
  Role.SUB_ADMIN,
  Role.DEPARTMENT_HEAD,
]);

export class DepartmentService {
  private organizationId(actor: AuthUser, requestedOrganizationId?: string) {
    if (actor.role === Role.SUPER_ADMIN) {
      if (!requestedOrganizationId) {
        throw new ApiError(400, "organizationId is required");
      }
      return requestedOrganizationId;
    }
    if (!actor.organizationId) {
      throw new ApiError(400, "Organization context is required");
    }
    if (
      requestedOrganizationId &&
      requestedOrganizationId !== actor.organizationId
    ) {
      throw new ApiError(403, "Organization context mismatch");
    }
    return actor.organizationId;
  }

  private assertScope(actor: AuthUser, departmentId: string) {
    if (
      scopedDepartmentRoles.has(actor.role) &&
      !actor.departmentIds.includes(departmentId) &&
      actor.departmentId !== departmentId
    ) {
      throw new ApiError(403, "Department is outside your assigned scope");
    }
  }

  private scopedFilter(
    actor: AuthUser,
    filter: DepartmentListFilter,
  ): DepartmentListFilter {
    if (!scopedDepartmentRoles.has(actor.role)) return filter;
    const departmentIds = [
      ...new Set([
        ...actor.departmentIds,
        ...(actor.departmentId ? [actor.departmentId] : []),
      ]),
    ];
    return { ...filter, departmentIds };
  }

  private async validateHead(
    organizationId: string,
    headUserId?: string | null,
  ) {
    if (!headUserId) return;
    const user = await userRepository.findById(headUserId, organizationId);
    if (!user?.isActive) {
      throw new ApiError(422, "Department head must be an active organization user");
    }
  }

  async create(actor: AuthUser, data: DepartmentInput) {
    const organizationId = this.organizationId(actor, data.organizationId);
    const headUserId = data.headId ?? data.headUserId;
    await this.validateHead(organizationId, headUserId);
    const record: DepartmentCreateRecord = {
      organizationId,
      name: data.name,
      code: data.code,
      description: data.description,
      headUserId: headUserId ?? undefined,
      budgetAllocated: data.budgetAllocated,
      budgetPeriod: data.budgetPeriod,
      budgetPeriodStartedAt: data.budgetPeriodStartedAt,
      isActive: data.isActive,
    };
    const department = await departmentRepository.create(record);
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "department.create",
        entityType: "Department",
        entityId: department.id,
        after: department.toObject(),
      },
    );
    return department;
  }

  list(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    filter: DepartmentListFilter,
  ) {
    return departmentRepository.list(
      this.organizationId(actor, requestedOrganizationId),
      this.scopedFilter(actor, filter),
    );
  }

  async get(
    actor: AuthUser,
    id: string,
    requestedOrganizationId?: string,
  ) {
    this.assertScope(actor, id);
    const department = await departmentRepository.findById(
      this.organizationId(actor, requestedOrganizationId),
      id,
    );
    if (!department) throw new ApiError(404, "Department not found");
    return department;
  }

  async update(
    actor: AuthUser,
    id: string,
    data: Partial<DepartmentInput>,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    this.assertScope(actor, id);
    const before = await departmentRepository.findDocument(
      organizationId,
      id,
    );
    if (!before) throw new ApiError(404, "Department not found");
    const headUserId = data.headId ?? data.headUserId;
    if (headUserId !== undefined) {
      await this.validateHead(organizationId, headUserId);
    }
    if (
      data.budgetAllocated !== undefined &&
      data.budgetAllocated > 0 &&
      data.budgetAllocated < before.budgetUsed + before.budgetCommitted
    ) {
      throw new ApiError(
        409,
        "Budget cannot be lower than used and committed amounts",
      );
    }
    const update: Record<string, unknown> = { ...data };
    delete update.organizationId;
    delete update.headId;
    if (headUserId === null) {
      delete update.headUserId;
      update.$unset = { headUserId: 1 };
    } else if (headUserId) {
      update.headUserId = headUserId;
    }
    const department = await departmentRepository.update(
      organizationId,
      id,
      update,
    );
    if (!department) throw new ApiError(404, "Department not found");
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "department.update",
        entityType: "Department",
        entityId: id,
        before: before.toObject(),
        after: department.toObject(),
      },
    );
    return department;
  }

  async remove(
    actor: AuthUser,
    id: string,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    const department = await departmentRepository.findDocument(
      organizationId,
      id,
    );
    if (!department) throw new ApiError(404, "Department not found");
    const [users, requests] = await Promise.all([
      departmentRepository.countAssignedUsers(organizationId, id),
      departmentRepository.countActiveRequests(organizationId, id),
    ]);
    if (users || requests) {
      throw new ApiError(
        409,
        "Department cannot be deleted while users or active requests reference it",
      );
    }
    await departmentRepository.softDelete(organizationId, id, actor.id);
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "department.delete",
        entityType: "Department",
        entityId: id,
        before: department.toObject(),
      },
    );
  }

  async requests(
    actor: AuthUser,
    id: string,
    requestedOrganizationId: string | undefined,
    filter: RequestListFilter,
  ) {
    this.assertScope(actor, id);
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    if (!(await departmentRepository.findDocument(organizationId, id))) {
      throw new ApiError(404, "Department not found");
    }
    return requestRepository.list(organizationId, {
      ...filter,
      departmentId: id,
    });
  }

  async budget(
    actor: AuthUser,
    id: string,
    requestedOrganizationId?: string,
  ) {
    this.assertScope(actor, id);
    const department = await departmentRepository.findDocument(
      this.organizationId(actor, requestedOrganizationId),
      id,
    );
    if (!department) throw new ApiError(404, "Department not found");
    const remaining =
      department.budgetAllocated > 0
        ? Math.max(
            0,
            department.budgetAllocated -
              department.budgetUsed -
              department.budgetCommitted,
          )
        : null;
    return {
      departmentId: department.id,
      period: department.budgetPeriod,
      periodStartedAt: department.budgetPeriodStartedAt,
      allocated: department.budgetAllocated,
      committed: department.budgetCommitted,
      used: department.budgetUsed,
      remaining,
      utilizationPercent:
        department.budgetAllocated > 0
          ? Number(
              (
                (department.budgetUsed / department.budgetAllocated) *
                100
              ).toFixed(2),
            )
          : 0,
      commitmentPercent:
        department.budgetAllocated > 0
          ? Number(
              (
                ((department.budgetUsed + department.budgetCommitted) /
                  department.budgetAllocated) *
                100
              ).toFixed(2),
            )
          : 0,
    };
  }
}

export const departmentService = new DepartmentService();
