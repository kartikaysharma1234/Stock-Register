import { Permission, ROLE_PERMISSIONS } from "../constants/permissions";
import { Role } from "../constants/roles";
import { createRequestValidation } from "./request.validation";

describe("RBAC permission matrix", () => {
  it("allows admins to override requests", () => {
    expect(ROLE_PERMISSIONS[Role.ADMIN]).toContain(Permission.REQUEST_OVERRIDE);
  });

  it("allows store managers to fulfill but not approve requests", () => {
    expect(ROLE_PERMISSIONS[Role.STORE_MANAGER]).toContain(
      Permission.REQUEST_FULFILL,
    );
    expect(ROLE_PERMISSIONS[Role.STORE_MANAGER]).not.toContain(
      Permission.REQUEST_APPROVE,
    );
  });

  it("keeps viewers read-only", () => {
    expect(ROLE_PERMISSIONS[Role.VIEWER]).toContain(Permission.INVENTORY_READ);
    expect(ROLE_PERMISSIONS[Role.VIEWER]).not.toContain(
      Permission.INVENTORY_MANAGE,
    );
  });
});

describe("stock request validation", () => {
  it("rejects requests without line items", () => {
    const result = createRequestValidation.safeParse({
      body: {
        departmentId: "507f1f77bcf86cd799439011",
        warehouseId: "507f1f77bcf86cd799439012",
        lines: [],
      },
    });
    expect(result.success).toBe(false);
  });
});
