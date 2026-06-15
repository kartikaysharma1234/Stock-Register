import { Permission, Role } from "../constants";
import {
  inviteUserValidation,
  verifyEmailValidation,
} from "./auth.validation";
import {
  roleCreateValidation,
  roleUpdateValidation,
} from "./role.validation";
import {
  userCreateValidation,
  userListValidation,
  userUpdateValidation,
} from "./user.validation";

const objectId = "507f1f77bcf86cd799439011";

describe("Module 2 validation", () => {
  it("accepts a complete tenant user payload", () => {
    const result = userCreateValidation.safeParse({
      body: {
        name: "Store Manager",
        email: "manager@example.com",
        password: "StrongPass1",
        role: Role.STORE_MANAGER,
        permissions: [Permission.REPORT_EXPORT],
        warehouseId: objectId,
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty user and role updates", () => {
    expect(
      userUpdateValidation.safeParse({
        params: { id: objectId },
        body: {},
      }).success,
    ).toBe(false);
    expect(
      roleUpdateValidation.safeParse({
        params: { id: objectId },
        body: {},
      }).success,
    ).toBe(false);
  });

  it("coerces pagination and active filters", () => {
    const result = userListValidation.parse({
      query: { page: "2", limit: "25", isActive: "true" },
    });

    expect(result.query).toMatchObject({
      page: 2,
      limit: 25,
      isActive: true,
    });
  });

  it("validates custom roles and invitations", () => {
    expect(
      roleCreateValidation.safeParse({
        body: {
          name: "Stock Auditor",
          permissions: [Permission.INVENTORY_READ, Permission.AUDIT_READ],
        },
      }).success,
    ).toBe(true);
    expect(
      inviteUserValidation.safeParse({
        body: {
          name: "Department Viewer",
          email: "viewer@example.com",
          role: Role.VIEWER,
          customRoleId: objectId,
        },
      }).success,
    ).toBe(true);
  });

  it("requires a sufficiently long email verification token", () => {
    expect(
      verifyEmailValidation.safeParse({ body: { token: "short" } }).success,
    ).toBe(false);
    expect(
      verifyEmailValidation.safeParse({
        body: { token: "a".repeat(64) },
      }).success,
    ).toBe(true);
  });
});
