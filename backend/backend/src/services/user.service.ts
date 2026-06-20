import { Permission, Role } from "../constants";
import { hashPassword } from "../helpers/hashing.helper";
import { roleRepository } from "../repository/role.repository";
import {
  UserListOptions,
  userRepository,
} from "../repository/user.repository";
import {
  DepartmentModel,
  IUser,
  WarehouseModel,
} from "../repository/schemas";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { auditService } from "./audit.service";
import { permissionService } from "./permission.service";

export interface UserCreateInput {
  organizationId?: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: Role;
  customRoleId?: string;
  permissions?: Permission[];
  departmentId?: string;
  warehouseId?: string;
  departmentIds?: string[];
  warehouseIds?: string[];
  isActive?: boolean;
}

export interface UserUpdateInput {
  name?: string;
  phone?: string | null;
  role?: Role;
  customRoleId?: string | null;
  departmentId?: string | null;
  warehouseId?: string | null;
  departmentIds?: string[];
  warehouseIds?: string[];
  isActive?: boolean;
}

const uniqueIds = (ids: Array<string | undefined>) =>
  [...new Set(ids.filter((id): id is string => Boolean(id)))];

export class UserService {
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

  private assertCanAssign(actor: AuthUser, role: Role) {
    if (!permissionService.canAssignRole(actor, role)) {
      throw new ApiError(403, "You cannot assign this role");
    }
  }

  private assertAssignmentScope(
    actor: AuthUser,
    departmentIds: string[],
    warehouseIds: string[],
  ) {
    if ([Role.SUPER_ADMIN, Role.ADMIN].includes(actor.role)) return;

    const hasDepartmentScope = departmentIds.some((id) =>
      actor.departmentIds.includes(id),
    );
    const hasWarehouseScope = warehouseIds.some((id) =>
      actor.warehouseIds.includes(id),
    );
    const departmentsValid = departmentIds.every((id) =>
      actor.departmentIds.includes(id),
    );
    const warehousesValid = warehouseIds.every((id) =>
      actor.warehouseIds.includes(id),
    );

    if (
      actor.role === Role.DEPARTMENT_HEAD &&
      (!departmentIds.length || !departmentsValid)
    ) {
      throw new ApiError(403, "User must belong to one of your departments");
    }
    if (
      actor.role === Role.STORE_MANAGER &&
      (!warehouseIds.length || !warehousesValid)
    ) {
      throw new ApiError(403, "User must belong to one of your warehouses");
    }
    if (
      actor.role === Role.SUB_ADMIN &&
      (!departmentsValid ||
        !warehousesValid ||
        (!hasDepartmentScope && !hasWarehouseScope))
    ) {
      throw new ApiError(403, "User is outside your assigned scope");
    }
  }

  private assertTargetScope(actor: AuthUser, user: IUser) {
    if ([Role.SUPER_ADMIN, Role.ADMIN].includes(actor.role)) return;
    this.assertAssignmentScope(
      actor,
      [
        user.departmentId?.toString(),
        ...user.departmentIds.map(String),
      ].filter((id): id is string => Boolean(id)),
      [
        user.warehouseId?.toString(),
        ...user.warehouseIds.map(String),
      ].filter((id): id is string => Boolean(id)),
    );
  }

  private async validateAssignments(
    organizationId: string,
    data: {
      customRoleId?: string | null;
      departmentId?: string | null;
      warehouseId?: string | null;
      departmentIds?: string[];
      warehouseIds?: string[];
    },
  ) {
    const departmentIds = uniqueIds([
      data.departmentId ?? undefined,
      ...(data.departmentIds ?? []),
    ]);
    const warehouseIds = uniqueIds([
      data.warehouseId ?? undefined,
      ...(data.warehouseIds ?? []),
    ]);

    const [customRole, departmentCount, warehouseCount] = await Promise.all([
      data.customRoleId
        ? roleRepository.findById(data.customRoleId, organizationId)
        : Promise.resolve(null),
      departmentIds.length
        ? DepartmentModel.countDocuments({
            _id: { $in: departmentIds },
            organizationId,
            isActive: true,
          })
        : Promise.resolve(0),
      warehouseIds.length
        ? WarehouseModel.countDocuments({
            _id: { $in: warehouseIds },
            organizationId,
            isActive: true,
          })
        : Promise.resolve(0),
    ]);

    if (data.customRoleId && !customRole) {
      throw new ApiError(422, "Custom role does not belong to this organization");
    }
    if (departmentCount !== departmentIds.length) {
      throw new ApiError(422, "One or more departments are invalid");
    }
    if (warehouseCount !== warehouseIds.length) {
      throw new ApiError(422, "One or more warehouses are invalid");
    }

    return { departmentIds, warehouseIds };
  }

  list(
    actor: AuthUser,
    organizationId: string | undefined,
    options: UserListOptions,
  ) {
    const scopedOptions = { ...options };
    if (actor.role === Role.SUB_ADMIN) {
      scopedOptions.scopeDepartmentIds = actor.departmentIds;
      scopedOptions.scopeWarehouseIds = actor.warehouseIds;
      if (
        !scopedOptions.scopeDepartmentIds.length &&
        !scopedOptions.scopeWarehouseIds.length
      ) {
        throw new ApiError(403, "No department or warehouse scope is assigned");
      }
    }
    return userRepository.list(
      this.organizationId(actor, organizationId),
      scopedOptions,
    );
  }

  async get(actor: AuthUser, id: string, requestedOrganizationId?: string) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    const user = await userRepository.findById(id, organizationId);
    if (!user) throw new ApiError(404, "User not found");
    this.assertTargetScope(actor, user);
    return user;
  }

  async create(actor: AuthUser, data: UserCreateInput) {
    const organizationId = this.organizationId(actor, data.organizationId);
    this.assertCanAssign(actor, data.role);
    if (await userRepository.findByEmail(data.email)) {
      throw new ApiError(409, "A user with this email already exists");
    }
    const assignments = await this.validateAssignments(organizationId, data);
    this.assertAssignmentScope(
      actor,
      assignments.departmentIds,
      assignments.warehouseIds,
    );
    const user = await userRepository.create({
      organizationId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash: await hashPassword(data.password),
      role: data.role,
      customRoleId: data.customRoleId,
      permissions: data.permissions ?? [],
      departmentId: data.departmentId,
      warehouseId: data.warehouseId,
      departmentIds: assignments.departmentIds,
      warehouseIds: assignments.warehouseIds,
      isActive: data.isActive ?? true,
      emailVerified: false,
    });
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "user.create",
        entityType: "User",
        entityId: user.id,
        after: user.toObject(),
      },
    );
    return user;
  }

  async update(
    actor: AuthUser,
    id: string,
    data: UserUpdateInput,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    const before = await userRepository.findById(id, organizationId);
    if (!before) throw new ApiError(404, "User not found");
    const targetOrganizationId = before.organizationId?.toString();
    if (!targetOrganizationId) {
      throw new ApiError(422, "Organization users must have an organization");
    }
    if (actor.id === id && (data.role || data.isActive === false)) {
      throw new ApiError(403, "You cannot change your own role or deactivate yourself");
    }
    if (data.role) this.assertCanAssign(actor, data.role);
    await this.protectLastAdmin(before.role, before.isActive, targetOrganizationId, data);

    const assignments = await this.validateAssignments(
      targetOrganizationId,
      data,
    );
    if (
      data.departmentId !== undefined ||
      data.departmentIds !== undefined ||
      data.warehouseId !== undefined ||
      data.warehouseIds !== undefined
    ) {
      this.assertAssignmentScope(
        actor,
        assignments.departmentIds,
        assignments.warehouseIds,
      );
    } else {
      this.assertTargetScope(actor, before);
    }
    const update: Record<string, unknown> = { ...data };
    if (data.customRoleId === null) {
      delete update.customRoleId;
      update.$unset = { customRoleId: 1 };
    }
    if (
      data.departmentId !== undefined ||
      data.departmentIds !== undefined
    ) {
      update.departmentIds = assignments.departmentIds;
    }
    if (data.departmentId === null) {
      delete update.departmentId;
      update.$unset = {
        ...((update.$unset as Record<string, number> | undefined) ?? {}),
        departmentId: 1,
      };
    }
    if (
      data.warehouseId !== undefined ||
      data.warehouseIds !== undefined
    ) {
      update.warehouseIds = assignments.warehouseIds;
    }
    if (data.warehouseId === null) {
      delete update.warehouseId;
      update.$unset = {
        ...((update.$unset as Record<string, number> | undefined) ?? {}),
        warehouseId: 1,
      };
    }

    const user = await userRepository.update(id, organizationId, update);
    if (!user) throw new ApiError(404, "User not found");
    await auditService.record(
      { actorId: actor.id, organizationId: targetOrganizationId },
      {
        action: "user.update",
        entityType: "User",
        entityId: id,
        before: before.toObject(),
        after: user.toObject(),
      },
    );
    return user;
  }

  async setPermissions(
    actor: AuthUser,
    id: string,
    permissions: Permission[],
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    const before = await userRepository.findById(id, organizationId);
    if (!before) throw new ApiError(404, "User not found");
    this.assertTargetScope(actor, before);
    if (actor.id === id) {
      throw new ApiError(403, "You cannot change your own permission grants");
    }
    if (!permissionService.canAssignRole(actor, before.role)) {
      throw new ApiError(403, "You cannot change permissions for this user");
    }
    const user = await userRepository.update(id, organizationId, {
      permissions: [...new Set(permissions)],
    });
    await auditService.record(
      {
        actorId: actor.id,
        organizationId: before.organizationId,
      },
      {
        action: "user.permissions.update",
        entityType: "User",
        entityId: id,
        before: { permissions: before.permissions },
        after: { permissions: user?.permissions ?? [] },
      },
    );
    return user;
  }

  async remove(
    actor: AuthUser,
    id: string,
    requestedOrganizationId?: string,
  ) {
    if (actor.id === id) {
      throw new ApiError(403, "You cannot delete your own account");
    }
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    const user = await userRepository.findById(id, organizationId);
    if (!user) throw new ApiError(404, "User not found");
    this.assertTargetScope(actor, user);
    const targetOrganizationId = user.organizationId?.toString();
    if (!targetOrganizationId) {
      throw new ApiError(403, "Super admin accounts cannot be deleted here");
    }
    if (!permissionService.canAssignRole(actor, user.role)) {
      throw new ApiError(403, "You cannot delete this user");
    }
    await this.protectLastAdmin(
      user.role,
      user.isActive,
      targetOrganizationId,
      { isActive: false },
    );
    const deleted = await userRepository.softDelete(
      id,
      organizationId,
      actor.id,
    );
    await userRepository.revokeAllUserTokens(id);
    await auditService.record(
      { actorId: actor.id, organizationId: targetOrganizationId },
      {
        action: "user.delete",
        entityType: "User",
        entityId: id,
        before: user.toObject(),
      },
    );
    return deleted;
  }

  private async protectLastAdmin(
    currentRole: Role,
    currentlyActive: boolean,
    organizationId: string,
    update: Pick<UserUpdateInput, "role" | "isActive">,
  ) {
    const removesActiveAdmin =
      currentRole === Role.ADMIN &&
      currentlyActive &&
      (update.role !== undefined && update.role !== Role.ADMIN ||
        update.isActive === false);
    if (
      removesActiveAdmin &&
      (await userRepository.countActiveAdmins(organizationId)) <= 1
    ) {
      throw new ApiError(409, "The organization must retain an active admin");
    }
  }
}

export const userService = new UserService();
