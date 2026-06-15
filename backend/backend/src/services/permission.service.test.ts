import { Permission, Role } from "../constants";
import { AuthUser } from "../types/auth";
import { permissionService } from "./permission.service";

const objectIdLike = (value: string) => ({ toString: () => value });

describe("PermissionService", () => {
  it("combines built-in permissions, user grants, and assignment scopes", async () => {
    const authUser = await permissionService.buildAuthUser({
      _id: objectIdLike("user-1"),
      organizationId: objectIdLike("org-1"),
      role: Role.VIEWER,
      permissions: [Permission.INVENTORY_UPDATE],
      departmentId: objectIdLike("department-1"),
      departmentIds: [objectIdLike("department-2")],
      warehouseId: objectIdLike("warehouse-1"),
      warehouseIds: [objectIdLike("warehouse-2")],
    });

    expect(authUser.permissions).toEqual(
      expect.arrayContaining([
        Permission.INVENTORY_READ,
        Permission.REPORT_READ,
        Permission.INVENTORY_UPDATE,
      ]),
    );
    expect(authUser.departmentIds).toEqual([
      "department-2",
      "department-1",
    ]);
    expect(authUser.warehouseIds).toEqual([
      "warehouse-2",
      "warehouse-1",
    ]);
  });

  it("enforces role hierarchy for assignments", () => {
    const admin: AuthUser = {
      id: "admin-1",
      organizationId: "org-1",
      role: Role.ADMIN,
      permissions: [],
      departmentIds: [],
      warehouseIds: [],
    };
    const superAdmin: AuthUser = {
      ...admin,
      id: "super-1",
      role: Role.SUPER_ADMIN,
      organizationId: undefined,
    };

    expect(permissionService.canAssignRole(admin, Role.SUB_ADMIN)).toBe(true);
    expect(permissionService.canAssignRole(admin, Role.ADMIN)).toBe(false);
    expect(permissionService.canAssignRole(admin, Role.SUPER_ADMIN)).toBe(false);
    expect(permissionService.canAssignRole(superAdmin, Role.ADMIN)).toBe(true);
    expect(permissionService.canAssignRole(superAdmin, Role.SUPER_ADMIN)).toBe(
      true,
    );
  });
});
