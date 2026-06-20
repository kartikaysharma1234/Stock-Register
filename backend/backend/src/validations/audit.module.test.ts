import {
  AuditModule,
  Permission,
  ROLE_PERMISSIONS,
  Role,
  SortOrder,
} from "../constants";
import { AuditLogModel } from "../repository/schemas";
import { inferAuditModule } from "../services/audit.service";
import {
  auditExportValidation,
  auditListValidation,
  auditResourceHistoryValidation,
} from "./audit.validation";

const organizationId = "507f1f77bcf86cd799439011";
const userId = "507f191e810c19729de860ea";
const resourceId = "507f191e810c19729de860eb";

describe("Module 8 audit and compliance", () => {
  it("defines audit module, aliases, snapshots, and soft-delete fields", () => {
    expect(AuditLogModel.schema.path("actorId")).toBeDefined();
    expect(AuditLogModel.schema.virtualpath("performedBy")).toBeDefined();
    expect(AuditLogModel.schema.path("module")).toBeDefined();
    expect(AuditLogModel.schema.path("entityType")).toBeDefined();
    expect(AuditLogModel.schema.virtualpath("resourceType")).toBeDefined();
    expect(AuditLogModel.schema.path("entityId")).toBeDefined();
    expect(AuditLogModel.schema.virtualpath("resourceId")).toBeDefined();
    expect(AuditLogModel.schema.path("before")).toBeDefined();
    expect(AuditLogModel.schema.virtualpath("previousValue")).toBeDefined();
    expect(AuditLogModel.schema.path("after")).toBeDefined();
    expect(AuditLogModel.schema.virtualpath("newValue")).toBeDefined();
    expect(AuditLogModel.schema.path("isDeleted")).toBeDefined();
  });

  it("infers audit modules from current service actions", () => {
    expect(inferAuditModule("Asset", "asset.assign")).toBe(AuditModule.ASSET);
    expect(inferAuditModule("PurchaseOrder", "purchase_order.approve")).toBe(
      AuditModule.PURCHASE,
    );
    expect(inferAuditModule("StockRequest", "request.fulfill")).toBe(
      AuditModule.REQUEST,
    );
    expect(inferAuditModule("User", "user.update")).toBe(AuditModule.USER);
    expect(inferAuditModule("Organization", "organization.update")).toBe(
      AuditModule.ORGANIZATION,
    );
  });

  it("validates paginated audit filters with canonical and legacy names", () => {
    const result = auditListValidation.parse({
      query: {
        organizationId,
        page: "2",
        limit: "10",
        performedBy: userId,
        resourceType: "Asset",
        resourceId,
        module: "ASSET",
        from: "2026-01-01",
        to: "2026-12-31",
      },
    });

    expect(result.query).toMatchObject({
      page: 2,
      limit: 10,
      performedBy: userId,
      resourceType: "Asset",
      resourceId,
      module: AuditModule.ASSET,
      sortOrder: SortOrder.DESC,
    });
  });

  it("validates export and resource history requests", () => {
    const exported = auditExportValidation.parse({
      query: {
        organizationId,
        format: "xlsx",
        action: "asset.assign",
      },
    });
    const history = auditResourceHistoryValidation.parse({
      params: { resourceId },
      query: {
        organizationId,
        page: "1",
        limit: "25",
      },
    });

    expect(exported.query.format).toBe("xlsx");
    expect(history.params.resourceId).toBe(resourceId);
  });

  it("rejects invalid date ranges", () => {
    expect(
      auditListValidation.safeParse({
        query: {
          from: "2026-12-31",
          to: "2026-01-01",
        },
      }).success,
    ).toBe(false);
  });

  it("maps audit permissions to compliance roles", () => {
    expect(ROLE_PERMISSIONS[Role.ADMIN]).toEqual(
      expect.arrayContaining([
        Permission.AUDIT_READ,
        Permission.AUDIT_EXPORT,
      ]),
    );
    expect(ROLE_PERMISSIONS[Role.SUB_ADMIN]).toEqual(
      expect.arrayContaining([
        Permission.AUDIT_READ,
        Permission.AUDIT_EXPORT,
      ]),
    );
    expect(ROLE_PERMISSIONS[Role.VIEWER]).toEqual(
      expect.arrayContaining([Permission.AUDIT_READ]),
    );
  });
});
