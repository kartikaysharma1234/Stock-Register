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

import {
  NotificationChannel,
  NotificationType,
  Permission,
  ROLE_PERMISSIONS,
  Role,
  SortOrder,
} from "../constants";
import { alertQueue, scheduleAlertJobs, whatsappQueue } from "../queue/alert.queue";
import {
  ItemModel,
  NotificationModel,
  NotificationPreferenceModel,
  UserModel,
} from "../repository/schemas";
import {
  notificationListValidation,
  notificationPreferenceValidation,
} from "./notification.validation";

interface QueueStub {
  name: string;
  add: jest.Mock;
}

describe("Module 9 notification and alert management", () => {
  it("defines notification fields for in-app, email, and WhatsApp delivery", () => {
    expect(NotificationModel.schema.path("organizationId")).toBeDefined();
    expect(NotificationModel.schema.path("userId")).toBeDefined();
    expect(NotificationModel.schema.path("type")).toBeDefined();
    expect(NotificationModel.schema.path("title")).toBeDefined();
    expect(NotificationModel.schema.path("message")).toBeDefined();
    expect(NotificationModel.schema.path("referenceType")).toBeDefined();
    expect(NotificationModel.schema.path("referenceId")).toBeDefined();
    expect(NotificationModel.schema.path("channels")).toBeDefined();
    expect(NotificationModel.schema.path("isRead")).toBeDefined();
    expect(NotificationModel.schema.path("readAt")).toBeDefined();
    expect(NotificationModel.schema.path("emailSentAt")).toBeDefined();
    expect(NotificationModel.schema.path("whatsappSentAt")).toBeDefined();
    expect(NotificationModel.schema.path("isDeleted")).toBeDefined();
  });

  it("defines per-user notification preferences and user phone support", () => {
    expect(NotificationPreferenceModel.schema.path("organizationId")).toBeDefined();
    expect(NotificationPreferenceModel.schema.path("userId")).toBeDefined();
    expect(NotificationPreferenceModel.schema.path("preferences")).toBeDefined();
    expect(NotificationPreferenceModel.schema.path("isDeleted")).toBeDefined();
    expect(UserModel.schema.path("phone")).toBeDefined();
    expect(ItemModel.schema.path("preferredVendorId")).toBeDefined();
  });

  it("validates notification list filters and normalizes enum casing", () => {
    const result = notificationListValidation.parse({
      query: {
        page: "2",
        limit: "10",
        unreadOnly: "true",
        type: "LOW_STOCK",
        sortOrder: "ASC",
      },
    });

    expect(result.query).toMatchObject({
      page: 2,
      limit: 10,
      unreadOnly: true,
      type: NotificationType.LOW_STOCK,
      sortOrder: SortOrder.ASC,
    });
  });

  it("validates notification preferences and rejects duplicate types", () => {
    const result = notificationPreferenceValidation.parse({
      body: {
        preferences: [
          {
            type: "EXPIRY_ALERT",
            channels: ["EMAIL", "IN_APP", "WHATSAPP"],
          },
        ],
      },
    });

    expect(result.body.preferences[0]).toEqual({
      type: NotificationType.EXPIRY_ALERT,
      channels: [
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP,
        NotificationChannel.WHATSAPP,
      ],
    });
    expect(
      notificationPreferenceValidation.safeParse({
        body: {
          preferences: [
            { type: "LOW_STOCK", channels: ["EMAIL"] },
            { type: "low_stock", channels: ["IN_APP"] },
          ],
        },
      }).success,
    ).toBe(false);
  });

  it("registers alert and WhatsApp queues with recurring job names", async () => {
    expect(alertQueue.name).toBe("inventory-alerts");
    expect(whatsappQueue.name).toBe("inventory-whatsapp");

    await scheduleAlertJobs();

    expect((alertQueue as unknown as QueueStub).add).toHaveBeenCalledWith(
      "lowStockAlertJob",
      {},
      expect.objectContaining({ jobId: "low-stock-alert" }),
    );
    expect((alertQueue as unknown as QueueStub).add).toHaveBeenCalledWith(
      "expiryAlertJob",
      { days: 30 },
      expect.objectContaining({ jobId: "expiry-alert" }),
    );
    expect((alertQueue as unknown as QueueStub).add).toHaveBeenCalledWith(
      "assetMaintenanceJob",
      {},
      expect.objectContaining({ jobId: "asset-maintenance-alert" }),
    );
    expect((alertQueue as unknown as QueueStub).add).toHaveBeenCalledWith(
      "budgetAlertJob",
      {},
      expect.objectContaining({ jobId: "budget-alert" }),
    );
    expect((alertQueue as unknown as QueueStub).add).toHaveBeenCalledWith(
      "autoReorderJob",
      {},
      expect.objectContaining({ jobId: "auto-reorder" }),
    );
    expect((alertQueue as unknown as QueueStub).add).toHaveBeenCalledWith(
      "reportSchedulerJob",
      {},
      expect.objectContaining({ jobId: "report-scheduler" }),
    );
  });

  it("maps notification permissions to all user roles", () => {
    expect(Object.values(NotificationType)).toEqual(
      expect.arrayContaining([
        NotificationType.LOW_STOCK,
        NotificationType.EXPIRY_ALERT,
        NotificationType.REQUEST_UPDATE,
        NotificationType.PO_UPDATE,
        NotificationType.ASSET_DUE,
        NotificationType.BUDGET_ALERT,
        NotificationType.SYSTEM,
      ]),
    );
    expect(ROLE_PERMISSIONS[Role.VIEWER]).toEqual(
      expect.arrayContaining([
        Permission.NOTIFICATION_READ,
        Permission.NOTIFICATION_UPDATE,
        Permission.NOTIFICATION_PREFERENCES,
      ]),
    );
  });
});
