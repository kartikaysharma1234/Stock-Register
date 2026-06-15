import {
  ALL_PERMISSIONS,
  ASSIGNABLE_ROLES,
  PLAN_LIMITS,
  Permission,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  Role,
  SubscriptionPlan,
} from "./index";

describe("canonical constants", () => {
  it("contains each assignable role once", () => {
    expect(ASSIGNABLE_ROLES).toEqual([
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.SUB_ADMIN,
      Role.STORE_MANAGER,
      Role.DEPARTMENT_HEAD,
      Role.VIEWER,
    ]);
  });

  it("keeps role hierarchy ordered", () => {
    expect(ROLE_HIERARCHY[Role.SUPER_ADMIN]).toBeGreaterThan(
      ROLE_HIERARCHY[Role.ADMIN],
    );
    expect(ROLE_HIERARCHY[Role.ADMIN]).toBeGreaterThan(
      ROLE_HIERARCHY[Role.SUB_ADMIN],
    );
    expect(ROLE_HIERARCHY[Role.STORE_MANAGER]).toBeGreaterThan(
      ROLE_HIERARCHY[Role.DEPARTMENT_HEAD],
    );
  });

  it("grants every permission to platform and organization admins", () => {
    expect(ROLE_PERMISSIONS[Role.SUPER_ADMIN]).toEqual(ALL_PERMISSIONS);
    expect(ROLE_PERMISSIONS[Role.ADMIN]).toEqual(ALL_PERMISSIONS);
  });

  it("keeps viewers free of mutating permissions", () => {
    expect(ROLE_PERMISSIONS[Role.VIEWER]).toContain(Permission.INVENTORY_READ);
    expect(ROLE_PERMISSIONS[Role.VIEWER]).not.toContain(
      Permission.INVENTORY_CREATE,
    );
    expect(ROLE_PERMISSIONS[Role.VIEWER]).not.toContain(
      Permission.REQUEST_APPROVE,
    );
  });

  it("defines the required SaaS plan limits", () => {
    expect(PLAN_LIMITS[SubscriptionPlan.FREE]).toMatchObject({
      maxUsers: 5,
      maxWarehouses: 1,
      maxItems: 100,
      apiAccess: false,
      requestsPerMinute: 100,
    });
    expect(PLAN_LIMITS[SubscriptionPlan.PRO].requestsPerMinute).toBe(500);
    expect(PLAN_LIMITS[SubscriptionPlan.ENTERPRISE].maxItems).toBeNull();
  });
});
