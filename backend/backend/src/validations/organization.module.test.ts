import {
  PLAN_LIMITS,
  PlanFeature,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../constants";
import { organizationCodeFromSlug, toSlug } from "../helpers/slug.helper";
import { evaluatePlanLimit } from "../middlewares/plan-limit.middleware";
import {
  OrganizationModel,
  SubscriptionModel,
} from "../repository/schemas";
import { OrganizationContext } from "../types/organization";
import {
  organizationRegisterValidation,
  organizationUpgradeValidation,
} from "./organisation.validation";

const freeOrganization: OrganizationContext = {
  id: "507f1f77bcf86cd799439011",
  name: "Acme",
  slug: "acme",
  subscriptionPlan: SubscriptionPlan.FREE,
  subscriptionStatus: SubscriptionStatus.ACTIVE,
  planLimits: { ...PLAN_LIMITS[SubscriptionPlan.FREE] },
  isActive: true,
};

describe("Module 1: organization onboarding", () => {
  it("normalizes a market-facing organization slug", () => {
    expect(toSlug("  Acme Stores & Supply  ")).toBe(
      "acme-stores-supply",
    );
    expect(organizationCodeFromSlug("acme-stores-supply")).toMatch(
      /^ACMESTORESSU-[A-F0-9]{6}$/,
    );
  });

  it("validates organization and initial admin registration", () => {
    const result = organizationRegisterValidation.safeParse({
      body: {
        organization: {
          name: "Acme Stores",
          slug: "acme-stores",
          billingEmail: "billing@acme.example",
        },
        admin: {
          name: "Admin User",
          email: "admin@acme.example",
          password: "SecurePass123",
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("only accepts paid plans in the upgrade request", () => {
    expect(
      organizationUpgradeValidation.safeParse({
        body: { plan: SubscriptionPlan.PRO },
      }).success,
    ).toBe(true);
    expect(
      organizationUpgradeValidation.safeParse({
        body: { plan: SubscriptionPlan.FREE },
      }).success,
    ).toBe(false);
  });
});

describe("Module 1: plan enforcement", () => {
  it("blocks a free organization at its user limit", () => {
    expect(
      evaluatePlanLimit(PlanFeature.USERS, freeOrganization, {
        users: 5,
        warehouses: 0,
        items: 0,
      }),
    ).toMatchObject({ allowed: false, limit: 5, current: 5 });
  });

  it("allows enterprise organizations unlimited numeric usage", () => {
    const enterpriseOrganization: OrganizationContext = {
      ...freeOrganization,
      subscriptionPlan: SubscriptionPlan.ENTERPRISE,
      planLimits: { ...PLAN_LIMITS[SubscriptionPlan.ENTERPRISE] },
    };
    expect(
      evaluatePlanLimit(PlanFeature.ITEMS, enterpriseOrganization, {
        users: 1_000,
        warehouses: 1_000,
        items: 1_000_000,
      }).allowed,
    ).toBe(true);
  });

  it("gates API access by plan", () => {
    expect(
      evaluatePlanLimit(PlanFeature.API_ACCESS, freeOrganization).allowed,
    ).toBe(false);
  });
});

describe("Module 1: tenant schemas", () => {
  it("defines soft-delete and subscription fields on organizations", () => {
    expect(OrganizationModel.schema.path("slug")).toBeDefined();
    expect(OrganizationModel.schema.path("planLimits")).toBeDefined();
    expect(OrganizationModel.schema.path("isDeleted")).toBeDefined();
    expect(
      OrganizationModel.schema.path("razorpaySubscriptionId"),
    ).toBeDefined();
  });

  it("requires organizationId on subscription records", () => {
    const organizationPath =
      SubscriptionModel.schema.path("organizationId");
    expect(organizationPath).toBeDefined();
    expect(organizationPath.options.required).toBe(true);
    expect(SubscriptionModel.schema.path("isDeleted")).toBeDefined();
  });
});
