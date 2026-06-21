import { Job } from "bull";
import { Types } from "mongoose";
import {
  AssetStatus,
  CounterType,
  NotificationType,
  PurchaseOrderStatus,
  ReportFrequency,
  Role,
  WebhookEvent,
} from "../constants";
import { counterRepository } from "../repository/counter.repository";
import { inventoryRepository } from "../repository/inventory.repository";
import { reportRepository } from "../repository/report.repository";
import {
  AssetModel,
  DepartmentModel,
  InventoryBalanceModel,
  OrganizationModel,
  PurchaseOrderModel,
} from "../repository/schemas";
import { userRepository } from "../repository/user.repository";
import { notificationService } from "../services/notification.service";
import { webhookService } from "../services/webhook.service";
import { logger } from "../utils/logger";
import { AlertJobData, alertQueue } from "./alert.queue";
import { reportQueue } from "./report.queue";

interface LowStockAlertRow {
  item: { _id: unknown; name: string; sku: string };
  warehouse: { _id: unknown; name: string; code: string };
  availableQuantity: number;
  effectiveThreshold: number;
}

interface ExpiringBatchAlertRow {
  item: { _id: unknown; name: string; sku: string };
  warehouse: { _id: unknown; name: string; code: string };
  batchNumber: string;
  expiryDate: Date;
  remainingQuantity: number;
}

interface AutoReorderCandidate {
  itemId: unknown;
  warehouseId: unknown;
  availableQuantity: number;
  averageCost: number;
  item: {
    name: string;
    sku: string;
    reorderPoint: number;
    reorderQuantity: number;
    preferredVendorId: unknown;
  };
}

interface AutoReorderGroup {
  vendorId: string;
  warehouseId: string;
  lines: Array<{
    itemId: string;
    name: string;
    quantity: number;
    unitCost: number;
  }>;
}

const reportFilterString = (filters: Record<string, unknown>, key: string) => {
  const value = filters[key];
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : undefined;
};

const reportFilterNumber = (filters: Record<string, unknown>, key: string) => {
  const value = filters[key];
  return typeof value === "number" ? value : undefined;
};

const queueReportFilters = (filters: Record<string, unknown> = {}) => ({
  from: reportFilterString(filters, "from"),
  to: reportFilterString(filters, "to"),
  warehouseId: reportFilterString(filters, "warehouseId"),
  departmentId: reportFilterString(filters, "departmentId"),
  itemId: reportFilterString(filters, "itemId"),
  categoryId: reportFilterString(filters, "categoryId"),
  limit: reportFilterNumber(filters, "limit"),
});

const nextReportRunAt = (
  frequency: ReportFrequency,
  base = new Date(),
) => {
  const next = new Date(base);
  switch (frequency) {
    case ReportFrequency.DAILY:
      next.setUTCDate(next.getUTCDate() + 1);
      return next;
    case ReportFrequency.WEEKLY:
      next.setUTCDate(next.getUTCDate() + 7);
      return next;
    case ReportFrequency.MONTHLY:
      next.setUTCMonth(next.getUTCMonth() + 1);
      return next;
    case ReportFrequency.NONE:
      return undefined;
  }
};

const activeOrganizationIds = async (organizationId?: string) => {
  if (organizationId) return [organizationId];
  const organizations = await OrganizationModel.find({
    isActive: true,
    isDeleted: { $ne: true },
  }).select("_id");
  return organizations.map((organization) => organization.id);
};

const notifyUsers = async (
  organizationId: string,
  userIds: string[],
  data: {
    type: NotificationType;
    title: string;
    message: string;
    template: string;
    variables: Record<string, string | number>;
    referenceType?: string;
    referenceId?: string;
  },
) => {
  if (!userIds.length) return [];
  return notificationService.notifyMany(userIds, {
    organizationId,
    ...data,
  });
};

const processLowStock = async (job: Job<AlertJobData>) => {
  let sent = 0;
  for (const organizationId of await activeOrganizationIds(
    job.data.organizationId,
  )) {
    const rows = (await inventoryRepository.listLowStock(
      organizationId,
    )) as LowStockAlertRow[];
    for (const row of rows) {
      const warehouseId = String(row.warehouse._id);
      const users = await userRepository.findUsersForNotification(
        organizationId,
        [Role.ADMIN, Role.STORE_MANAGER],
        warehouseId,
      );
      await notifyUsers(
        organizationId,
        users.map((user) => user.id),
        {
          type: NotificationType.LOW_STOCK,
          title: `Low stock alert: ${row.item.name}`,
          message: `${row.item.name} (${row.item.sku}) has ${row.availableQuantity} available in ${row.warehouse.name}.`,
          template: "lowStockAlert",
          variables: {
            itemName: row.item.name,
            sku: row.item.sku,
            quantity: row.availableQuantity,
            threshold: row.effectiveThreshold,
          },
          referenceType: "Item",
          referenceId: String(row.item._id),
        },
      );
      await webhookService.emit({
        organizationId,
        event: WebhookEvent.STOCK_LOW,
        payload: {
          itemId: String(row.item._id),
          itemName: row.item.name,
          sku: row.item.sku,
          warehouseId,
          warehouseName: row.warehouse.name,
          availableQuantity: row.availableQuantity,
          threshold: row.effectiveThreshold,
          occurredAt: new Date().toISOString(),
        },
      });
      sent += users.length;
    }
  }
  return { sent };
};

const processExpiryAlerts = async (job: Job<AlertJobData>) => {
  let sent = 0;
  const days = job.data.days ?? 30;
  const from = new Date();
  const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  for (const organizationId of await activeOrganizationIds(
    job.data.organizationId,
  )) {
    const result = await inventoryRepository.listExpiringBatches(
      organizationId,
      from,
      to,
      { limit: 100 },
    );
    const rows = result.rows as ExpiringBatchAlertRow[];
    for (const row of rows) {
      const warehouseId = String(row.warehouse._id);
      const users = await userRepository.findUsersForNotification(
        organizationId,
        [Role.ADMIN, Role.STORE_MANAGER],
        warehouseId,
      );
      await notifyUsers(
        organizationId,
        users.map((user) => user.id),
        {
          type: NotificationType.EXPIRY_ALERT,
          title: `Expiry alert: ${row.item.name}`,
          message: `${row.item.name} batch ${row.batchNumber} expires on ${row.expiryDate.toISOString().slice(0, 10)}.`,
          template: "expiryAlert",
          variables: {
            itemName: row.item.name,
            batchNumber: row.batchNumber,
            expiryDate: row.expiryDate.toISOString().slice(0, 10),
            quantity: row.remainingQuantity,
          },
          referenceType: "Item",
          referenceId: String(row.item._id),
        },
      );
      sent += users.length;
    }
  }
  return { sent };
};

const processAssetMaintenance = async (job: Job<AlertJobData>) => {
  let sent = 0;
  const dueBefore = new Date();
  for (const organizationId of await activeOrganizationIds(
    job.data.organizationId,
  )) {
    const assets = await AssetModel.find({
      organizationId,
      isDeleted: { $ne: true },
      status: { $ne: AssetStatus.DISPOSED },
      "maintenanceSchedule.nextDue": { $lte: dueBefore },
    }).limit(100);
    for (const asset of assets) {
      const users = await userRepository.findUsersForNotification(
        organizationId,
        [Role.ADMIN, Role.SUB_ADMIN, Role.STORE_MANAGER],
        asset.warehouseId.toString(),
      );
      await notifyUsers(
        organizationId,
        users.map((user) => user.id),
        {
          type: NotificationType.ASSET_DUE,
          title: `Asset maintenance due: ${asset.name}`,
          message: `${asset.name} (${asset.assetTag}) is due for maintenance.`,
          template: "assetMaintenanceDue",
          variables: {
            assetName: asset.name,
            assetTag: asset.assetTag,
            dueDate: dueBefore.toISOString().slice(0, 10),
          },
          referenceType: "Asset",
          referenceId: asset.id,
        },
      );
      sent += users.length;
    }
  }
  return { sent };
};

const processBudgetAlerts = async (job: Job<AlertJobData>) => {
  let sent = 0;
  for (const organizationId of await activeOrganizationIds(
    job.data.organizationId,
  )) {
    const departments = await DepartmentModel.find({
      organizationId,
      isDeleted: { $ne: true },
      budgetAllocated: { $gt: 0 },
      $expr: {
        $gte: [
          {
            $multiply: [
              {
                $divide: [
                  {
                    $add: [
                      { $ifNull: ["$budgetUsed", 0] },
                      { $ifNull: ["$budgetCommitted", 0] },
                    ],
                  },
                  "$budgetAllocated",
                ],
              },
              100,
            ],
          },
          80,
        ],
      },
    }).limit(100);
    for (const department of departments) {
      const utilization = Number(
        (
          ((department.budgetUsed + department.budgetCommitted) /
            department.budgetAllocated) *
          100
        ).toFixed(2),
      );
      const users = await userRepository.findDepartmentApprovers(
        organizationId,
        department.id,
      );
      await notifyUsers(
        organizationId,
        users.map((user) => user.id),
        {
          type: NotificationType.BUDGET_ALERT,
          title: `Budget alert: ${department.name}`,
          message: `${department.name} has used or committed ${utilization}% of its budget.`,
          template: "budgetOverrun",
          variables: {
            departmentName: department.name,
            utilization,
            allocated: department.budgetAllocated,
          },
          referenceType: "Department",
          referenceId: department.id,
        },
      );
      sent += users.length;
    }
  }
  return { sent };
};

const openPurchaseStatuses = [
  PurchaseOrderStatus.DRAFT,
  PurchaseOrderStatus.PENDING_APPROVAL,
  PurchaseOrderStatus.APPROVED,
  PurchaseOrderStatus.SENT_TO_VENDOR,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
] as const;

const autoReorderCandidates = (organizationId: string) =>
  InventoryBalanceModel.aggregate<AutoReorderCandidate>([
    {
      $match: {
        organizationId: new Types.ObjectId(organizationId),
        isDeleted: { $ne: true },
      },
    },
    {
      $lookup: {
        from: "items",
        localField: "itemId",
        foreignField: "_id",
        as: "item",
      },
    },
    { $unwind: "$item" },
    {
      $match: {
        "item.isActive": true,
        "item.isDeleted": { $ne: true },
        "item.reorderPoint": { $gt: 0 },
        "item.preferredVendorId": { $exists: true, $ne: null },
      },
    },
    {
      $addFields: {
        availableQuantity: {
          $ifNull: [
            "$availableQuantity",
            {
              $max: [
                0,
                {
                  $subtract: [
                    "$quantity",
                    { $ifNull: ["$reservedQuantity", 0] },
                  ],
                },
              ],
            },
          ],
        },
      },
    },
    {
      $match: {
        $expr: { $lt: ["$availableQuantity", "$item.reorderPoint"] },
      },
    },
    { $limit: 100 },
  ]);

const processAutoReorder = async (job: Job<AlertJobData>) => {
  let createdDraftPurchaseOrders = 0;
  for (const organizationId of await activeOrganizationIds(
    job.data.organizationId,
  )) {
    const admins = await userRepository.findUsersForNotification(
      organizationId,
      [Role.ADMIN],
    );
    const createdBy = admins[0]?.id;
    if (!createdBy) continue;

    const groups = new Map<string, AutoReorderGroup>();
    for (const candidate of await autoReorderCandidates(organizationId)) {
      const itemId = String(candidate.itemId);
      const vendorId = String(candidate.item.preferredVendorId);
      const warehouseId = String(candidate.warehouseId);
      const existingOpenOrder = await PurchaseOrderModel.exists({
        organizationId,
        vendorId,
        warehouseId,
        status: { $in: openPurchaseStatuses },
        isDeleted: { $ne: true },
        "items.itemId": itemId,
      });
      if (existingOpenOrder) continue;

      const reorderGap = Math.max(
        candidate.item.reorderPoint - candidate.availableQuantity,
        0,
      );
      const quantity = Math.max(
        candidate.item.reorderQuantity || 0,
        reorderGap,
      );
      if (quantity <= 0) continue;

      const key = `${vendorId}:${warehouseId}`;
      const group =
        groups.get(key) ??
        {
          vendorId,
          warehouseId,
          lines: [],
        };
      group.lines.push({
        itemId,
        name: `${candidate.item.name} (${candidate.item.sku})`,
        quantity,
        unitCost: Math.max(candidate.averageCost ?? 0, 0),
      });
      groups.set(key, group);
    }

    for (const group of groups.values()) {
      const items = group.lines.map((line) => ({
        itemId: line.itemId,
        quantity: line.quantity,
        receivedQuantity: 0,
        unitCost: line.unitCost,
        taxRate: 0,
        totalCost: line.quantity * line.unitCost,
        notes: "Auto reorder draft created by inventory alert job.",
      }));
      const subTotal = items.reduce((total, item) => total + item.totalCost, 0);
      const purchaseOrder = await PurchaseOrderModel.create({
        organizationId,
        poNumber: await counterRepository.nextNumber(
          organizationId,
          CounterType.PURCHASE_ORDER,
        ),
        vendorId: group.vendorId,
        warehouseId: group.warehouseId,
        status: PurchaseOrderStatus.DRAFT,
        items,
        subTotal,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: subTotal,
        notes: `Auto reorder draft for ${group.lines
          .map((line) => line.name)
          .join(", ")}`,
        createdBy,
        attachments: [],
        isDeleted: false,
      });
      createdDraftPurchaseOrders += 1;
      await notifyUsers(
        organizationId,
        admins.map((user) => user.id),
        {
          type: NotificationType.PO_UPDATE,
          title: `Draft reorder PO created: ${purchaseOrder.poNumber}`,
          message: `${purchaseOrder.poNumber} was created for low stock items.`,
          template: "purchaseOrderApproval",
          variables: {
            poNumber: purchaseOrder.poNumber,
            total: purchaseOrder.totalAmount,
          },
          referenceType: "PurchaseOrder",
          referenceId: purchaseOrder.id,
        },
      );
    }
  }
  return { createdDraftPurchaseOrders };
};

const processReportScheduler = async (job: Job<AlertJobData>) => {
  const now = new Date();
  let scheduledReports = 0;
  const reports = await reportRepository.dueScheduledReports(
    now,
    job.data.organizationId,
  );
  for (const report of reports) {
    const queued = await reportQueue.add({
      organizationId: report.organizationId.toString(),
      requestedBy: report.createdBy.toString(),
      recipients: report.recipients,
      savedReportId: report.id,
      kind: report.kind,
      format: report.format,
      filters: queueReportFilters(report.filters),
    });
    const nextRunAt = nextReportRunAt(report.frequency, now);
    if (nextRunAt) {
      await reportRepository.markScheduledRun(
        report.id,
        String(queued.id),
        nextRunAt,
      );
    }
    scheduledReports += 1;
  }
  return { scheduledReports };
};

export const registerAlertProcessors = () => {
  alertQueue.process("lowStockAlertJob", processLowStock);
  alertQueue.process("expiryAlertJob", processExpiryAlerts);
  alertQueue.process("assetMaintenanceJob", processAssetMaintenance);
  alertQueue.process("budgetAlertJob", processBudgetAlerts);
  alertQueue.process("autoReorderJob", processAutoReorder);
  alertQueue.process("reportSchedulerJob", processReportScheduler);
  alertQueue.on("failed", (job, error) => {
    logger.error("Alert job failed", { jobId: job.id, name: job.name, error });
  });
};
