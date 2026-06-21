import {
  ApiKeyStatus,
  AuditModule,
  Permission,
  ROLE_PERMISSIONS,
  Role,
  SortOrder,
} from "../constants";
import { ApiKeyModel, ApiKeyUsageLogModel } from "../repository/schemas";
import {
  apiKeyCreateValidation,
  apiKeyListValidation,
  apiKeyRevokeValidation,
  apiKeyUpdateValidation,
  apiKeyUsageValidation,
} from "./apiKey.validation";

const organizationId = "507f1f77bcf86cd799439011";
const apiKeyId = "507f191e810c19729de860ea";

describe("Module 11 API key management", () => {
  it("defines API key persistence fields without selecting secret hashes", () => {
    expect(ApiKeyModel.schema.path("organizationId")).toBeDefined();
    expect(ApiKeyModel.schema.path("name")).toBeDefined();
    expect(ApiKeyModel.schema.path("prefix")).toBeDefined();
    expect(ApiKeyModel.schema.path("keyHash")).toBeDefined();
    expect(ApiKeyModel.schema.path("keyLast4")).toBeDefined();
    expect(ApiKeyModel.schema.path("scopes")).toBeDefined();
    expect(ApiKeyModel.schema.path("allowedIps")).toBeDefined();
    expect(ApiKeyModel.schema.path("status")).toBeDefined();
    expect(ApiKeyModel.schema.path("expiresAt")).toBeDefined();
    expect(ApiKeyModel.schema.path("lastUsedAt")).toBeDefined();
    expect(ApiKeyModel.schema.path("usageCount")).toBeDefined();
    expect(ApiKeyModel.schema.path("rotatedAt")).toBeDefined();
    expect(ApiKeyModel.schema.path("revokedAt")).toBeDefined();
    expect(ApiKeyModel.schema.path("isDeleted")).toBeDefined();
    expect(ApiKeyModel.schema.path("keyHash").options.select).toBe(false);
  });

  it("defines API key usage logs", () => {
    expect(ApiKeyUsageLogModel.schema.path("organizationId")).toBeDefined();
    expect(ApiKeyUsageLogModel.schema.path("apiKeyId")).toBeDefined();
    expect(ApiKeyUsageLogModel.schema.path("method")).toBeDefined();
    expect(ApiKeyUsageLogModel.schema.path("path")).toBeDefined();
    expect(ApiKeyUsageLogModel.schema.path("statusCode")).toBeDefined();
    expect(ApiKeyUsageLogModel.schema.path("userAgent")).toBeDefined();
  });

  it("validates API key creation and normalizes defaults", () => {
    const result = apiKeyCreateValidation.parse({
      body: {
        organizationId,
        name: "Warehouse sync",
        scopes: [Permission.INVENTORY_READ, Permission.REPORT_READ],
        allowedIps: ["127.0.0.1", "10.0.0.0/24"],
        expiresAt: "2999-01-01",
      },
    });

    expect(result.body).toMatchObject({
      organizationId,
      name: "Warehouse sync",
      scopes: [Permission.INVENTORY_READ, Permission.REPORT_READ],
      allowedIps: ["127.0.0.1", "10.0.0.0/24"],
    });
    expect(result.body.expiresAt).toBeInstanceOf(Date);
  });

  it("rejects empty scopes, past expiry dates, and empty updates", () => {
    expect(
      apiKeyCreateValidation.safeParse({
        body: {
          name: "Bad key",
          scopes: [],
        },
      }).success,
    ).toBe(false);
    expect(
      apiKeyCreateValidation.safeParse({
        body: {
          name: "Expired key",
          scopes: [Permission.INVENTORY_READ],
          expiresAt: "2000-01-01",
        },
      }).success,
    ).toBe(false);
    expect(
      apiKeyUpdateValidation.safeParse({
        params: { id: apiKeyId },
        query: {},
        body: {},
      }).success,
    ).toBe(false);
  });

  it("validates list, revoke, and usage requests", () => {
    const list = apiKeyListValidation.parse({
      query: {
        organizationId,
        page: "2",
        limit: "10",
        status: "ACTIVE",
        sortOrder: "ASC",
      },
    });
    const revoke = apiKeyRevokeValidation.parse({
      params: { id: apiKeyId },
      query: { organizationId },
      body: { reason: "Compromised" },
    });
    const usage = apiKeyUsageValidation.parse({
      params: { id: apiKeyId },
      query: {
        organizationId,
        page: "1",
        limit: "25",
      },
    });

    expect(list.query).toMatchObject({
      page: 2,
      limit: 10,
      status: ApiKeyStatus.ACTIVE,
      sortOrder: SortOrder.ASC,
    });
    expect(revoke.body.reason).toBe("Compromised");
    expect(usage.query.limit).toBe(25);
  });

  it("maps API key permissions to admin roles only", () => {
    expect(AuditModule.API_KEY).toBe("api_key");
    expect(ROLE_PERMISSIONS[Role.ADMIN]).toEqual(
      expect.arrayContaining([
        Permission.APIKEY_CREATE,
        Permission.APIKEY_READ,
        Permission.APIKEY_ROTATE,
        Permission.APIKEY_DELETE,
      ]),
    );
    expect(ROLE_PERMISSIONS[Role.VIEWER]).not.toContain(
      Permission.APIKEY_CREATE,
    );
    expect(ROLE_PERMISSIONS[Role.STORE_MANAGER]).not.toContain(
      Permission.APIKEY_CREATE,
    );
  });
});
