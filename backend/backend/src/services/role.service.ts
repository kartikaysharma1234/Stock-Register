import {
  ASSIGNABLE_ROLES,
  Permission,
  ROLE_PERMISSIONS,
  Role,
} from "../constants";
import { roleRepository } from "../repository/role.repository";
import { userRepository } from "../repository/user.repository";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { auditService } from "./audit.service";

export interface RoleInput {
  organizationId?: string;
  name: string;
  permissions: Permission[];
}

const displayName = (role: Role) =>
  role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export class RoleService {
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
      throw new ApiError(403, "Cross-organization access is not allowed");
    }
    return actor.organizationId;
  }

  async list(actor: AuthUser, requestedOrganizationId?: string) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    const customRoles = await roleRepository.list(organizationId);
    const builtInRoles = ASSIGNABLE_ROLES.map((role) => ({
      id: role,
      key: role,
      name: displayName(role),
      permissions: ROLE_PERMISSIONS[role],
      isCustom: false,
      isActive: true,
    }));
    return { builtInRoles, customRoles };
  }

  async create(actor: AuthUser, data: RoleInput) {
    const organizationId = this.organizationId(actor, data.organizationId);
    const role = await roleRepository.create({
      organizationId,
      name: data.name,
      permissions: [...new Set(data.permissions)],
    });
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "role.create",
        entityType: "Role",
        entityId: role.id,
        after: role.toObject(),
      },
    );
    return role;
  }

  async update(
    actor: AuthUser,
    id: string,
    data: { name?: string; permissions?: Permission[]; isActive?: boolean },
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    const before = await roleRepository.findById(id, organizationId);
    if (!before) throw new ApiError(404, "Custom role not found");
    const role = await roleRepository.update(id, organizationId, {
      ...data,
      ...(data.permissions
        ? { permissions: [...new Set(data.permissions)] }
        : {}),
    });
    if (!role) throw new ApiError(404, "Custom role not found");
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "role.update",
        entityType: "Role",
        entityId: id,
        before: before.toObject(),
        after: role.toObject(),
      },
    );
    return role;
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
    const role = await roleRepository.findById(id, organizationId);
    if (!role) throw new ApiError(404, "Custom role not found");
    if (await userRepository.countByCustomRole(organizationId, id)) {
      throw new ApiError(409, "Custom role is assigned to one or more users");
    }
    const deleted = await roleRepository.softDelete(
      id,
      organizationId,
      actor.id,
    );
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "role.delete",
        entityType: "Role",
        entityId: id,
        before: role.toObject(),
      },
    );
    return deleted;
  }
}

export const roleService = new RoleService();
