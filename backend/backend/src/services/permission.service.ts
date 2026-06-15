import { Permission, ROLE_HIERARCHY, ROLE_PERMISSIONS, Role } from "../constants";
import { RoleModel } from "../repository/schemas";
import { AuthUser } from "../types/auth";

interface PermissionSubject {
  _id: { toString(): string };
  organizationId?: { toString(): string };
  role: Role;
  customRoleId?: { toString(): string };
  permissions?: Permission[];
  departmentId?: { toString(): string };
  warehouseId?: { toString(): string };
  departmentIds?: Array<{ toString(): string }>;
  warehouseIds?: Array<{ toString(): string }>;
}

export class PermissionService {
  async resolve(subject: PermissionSubject): Promise<Permission[]> {
    const resolved = new Set<Permission>(ROLE_PERMISSIONS[subject.role]);

    if (subject.customRoleId && subject.organizationId) {
      const customRole = await RoleModel.findOne({
        _id: subject.customRoleId,
        organizationId: subject.organizationId,
        isActive: true,
        isDeleted: false,
      }).select("permissions");
      customRole?.permissions.forEach((permission: Permission) =>
        resolved.add(permission),
      );
    }

    subject.permissions?.forEach((permission) => resolved.add(permission));
    return [...resolved];
  }

  async buildAuthUser(subject: PermissionSubject): Promise<AuthUser> {
    const departmentIds = new Set(
      (subject.departmentIds ?? []).map(String),
    );
    const warehouseIds = new Set(
      (subject.warehouseIds ?? []).map(String),
    );
    if (subject.departmentId) departmentIds.add(subject.departmentId.toString());
    if (subject.warehouseId) warehouseIds.add(subject.warehouseId.toString());

    return {
      id: subject._id.toString(),
      organizationId: subject.organizationId?.toString(),
      role: subject.role,
      customRoleId: subject.customRoleId?.toString(),
      permissions: await this.resolve(subject),
      departmentId: subject.departmentId?.toString(),
      warehouseId: subject.warehouseId?.toString(),
      departmentIds: [...departmentIds],
      warehouseIds: [...warehouseIds],
    };
  }

  canAssignRole(actor: AuthUser, targetRole: Role): boolean {
    return (
      actor.role === Role.SUPER_ADMIN ||
      (targetRole !== Role.SUPER_ADMIN &&
        ROLE_HIERARCHY[actor.role] > ROLE_HIERARCHY[targetRole])
    );
  }
}

export const permissionService = new PermissionService();
