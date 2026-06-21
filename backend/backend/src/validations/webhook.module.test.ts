jest.mock("bull", () => {
  const Queue = jest.fn().mockImplementation((name: string) => ({
    name,
    add: jest.fn().mockResolvedValue({ id: `${name}-job` }),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    process: jest.fn(),
  }));
  return { __esModule: true, default: Queue };
});

import { createHmac } from "crypto";
import {
  Permission,
  ROLE_PERMISSIONS,
  Role,
  SortOrder,
  WebhookDeliveryStatus,
  WebhookEvent,
} from "../constants";
import { webhookQueue } from "../queue/webhook.queue";
import {
  WebhookDeliveryModel,
  WebhookEndpointModel,
} from "../repository/schemas";
import { signWebhookPayload } from "../services/webhook.service";
import {
  webhookCreateValidation,
  webhookDeliveryListValidation,
  webhookListValidation,
  webhookUpdateValidation,
} from "./webhook.validation";

const organizationId = "507f1f77bcf86cd799439011";
const webhookId = "507f191e810c19729de860ea";

describe("Module 12 webhooks", () => {
  it("defines webhook endpoint fields with encrypted secrets hidden by default", () => {
    expect(WebhookEndpointModel.schema.path("organizationId")).toBeDefined();
    expect(WebhookEndpointModel.schema.path("name")).toBeDefined();
    expect(WebhookEndpointModel.schema.path("url")).toBeDefined();
    expect(WebhookEndpointModel.schema.path("events")).toBeDefined();
    expect(WebhookEndpointModel.schema.path("secretEncrypted")).toBeDefined();
    expect(WebhookEndpointModel.schema.path("secretLast4")).toBeDefined();
    expect(WebhookEndpointModel.schema.path("headers")).toBeDefined();
    expect(WebhookEndpointModel.schema.path("lastTriggeredAt")).toBeDefined();
    expect(WebhookEndpointModel.schema.path("failureCount")).toBeDefined();
    expect(WebhookEndpointModel.schema.path("isDeleted")).toBeDefined();
    expect(
      WebhookEndpointModel.schema.path("secretEncrypted").options.select,
    ).toBe(false);
  });

  it("defines webhook delivery tracking fields", () => {
    expect(WebhookDeliveryModel.schema.path("organizationId")).toBeDefined();
    expect(WebhookDeliveryModel.schema.path("webhookId")).toBeDefined();
    expect(WebhookDeliveryModel.schema.path("event")).toBeDefined();
    expect(WebhookDeliveryModel.schema.path("payload")).toBeDefined();
    expect(WebhookDeliveryModel.schema.path("status")).toBeDefined();
    expect(WebhookDeliveryModel.schema.path("attempt")).toBeDefined();
    expect(WebhookDeliveryModel.schema.path("maxAttempts")).toBeDefined();
    expect(WebhookDeliveryModel.schema.path("nextAttemptAt")).toBeDefined();
    expect(WebhookDeliveryModel.schema.path("responseStatus")).toBeDefined();
    expect(WebhookDeliveryModel.schema.path("durationMs")).toBeDefined();
  });

  it("validates webhook create input and normalizes event casing", () => {
    const result = webhookCreateValidation.parse({
      body: {
        organizationId,
        name: "ERP Sync",
        url: "https://example.com/webhooks/stock-register",
        events: ["STOCK_UPDATED", "po.approved"],
        headers: { "X-ERP-Tenant": "demo" },
      },
    });

    expect(result.body.events).toEqual([
      WebhookEvent.STOCK_UPDATED,
      WebhookEvent.PO_APPROVED,
    ]);
    expect(result.body.headers).toEqual({ "X-ERP-Tenant": "demo" });
  });

  it("rejects unsafe URLs, duplicate events, and empty updates", () => {
    expect(
      webhookCreateValidation.safeParse({
        body: {
          name: "Local file",
          url: "file:///tmp/hook",
          events: [WebhookEvent.STOCK_UPDATED],
        },
      }).success,
    ).toBe(false);
    expect(
      webhookCreateValidation.safeParse({
        body: {
          name: "Duplicate events",
          url: "https://example.com/hook",
          events: ["stock.updated", "STOCK_UPDATED"],
        },
      }).success,
    ).toBe(false);
    expect(
      webhookUpdateValidation.safeParse({
        params: { id: webhookId },
        query: {},
        body: {},
      }).success,
    ).toBe(false);
  });

  it("validates webhook list and delivery filters", () => {
    const list = webhookListValidation.parse({
      query: {
        organizationId,
        page: "2",
        limit: "10",
        event: "REQUEST_APPROVED",
        isActive: "true",
        sortOrder: "ASC",
      },
    });
    const deliveries = webhookDeliveryListValidation.parse({
      params: { id: webhookId },
      query: {
        organizationId,
        status: "SUCCESS",
        event: "grn.received",
      },
    });

    expect(list.query).toMatchObject({
      page: 2,
      limit: 10,
      event: WebhookEvent.REQUEST_APPROVED,
      isActive: true,
      sortOrder: SortOrder.ASC,
    });
    expect(deliveries.query).toMatchObject({
      status: WebhookDeliveryStatus.SUCCESS,
      event: WebhookEvent.GRN_RECEIVED,
    });
  });

  it("registers webhook queue and signs payloads with HMAC SHA-256", () => {
    const body = JSON.stringify({ event: WebhookEvent.STOCK_UPDATED });
    const signature = signWebhookPayload("secret", "123", body);

    expect(webhookQueue.name).toBe("inventory-webhooks");
    expect(signature).toBe(
      createHmac("sha256", "secret")
        .update(`123.${body}`)
        .digest("hex"),
    );
  });

  it("maps webhook permissions to admin roles only", () => {
    expect(ROLE_PERMISSIONS[Role.ADMIN]).toEqual(
      expect.arrayContaining([
        Permission.WEBHOOK_CREATE,
        Permission.WEBHOOK_READ,
        Permission.WEBHOOK_UPDATE,
        Permission.WEBHOOK_DELETE,
        Permission.WEBHOOK_TEST,
      ]),
    );
    expect(ROLE_PERMISSIONS[Role.VIEWER]).not.toContain(
      Permission.WEBHOOK_CREATE,
    );
    expect(ROLE_PERMISSIONS[Role.STORE_MANAGER]).not.toContain(
      Permission.WEBHOOK_CREATE,
    );
  });
});
