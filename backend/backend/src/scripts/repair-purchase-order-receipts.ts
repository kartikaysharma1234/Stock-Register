import mongoose from "mongoose";
import { config } from "../config";
import {
  AuditModule,
  GrnItemCondition,
  PurchaseOrderStatus,
  StockMovementType,
  StockReferenceType,
} from "../constants";
import {
  AuditLogModel,
  GoodsReceivedNoteModel,
  InventoryBalanceModel,
  PurchaseOrderModel,
  StockBatchModel,
  StockMovementModel,
} from "../repository/schemas";

const poNumber = process.argv[2];

if (!poNumber) {
  throw new Error("Usage: tsx src/scripts/repair-purchase-order-receipts.ts PO-2026-0001");
}

const lineKey = (itemId: unknown, variantId?: unknown) =>
  `${String(itemId)}:${variantId ? String(variantId) : ""}`;

const run = async () => {
  await mongoose.connect(config.mongoUri);

  const purchaseOrder = await PurchaseOrderModel.findOne({
    poNumber: poNumber.toUpperCase(),
    isDeleted: { $ne: true },
  });
  if (!purchaseOrder) throw new Error(`Purchase order ${poNumber} not found`);

  const grns = await GoodsReceivedNoteModel.find({
    organizationId: purchaseOrder.organizationId,
    purchaseOrderId: purchaseOrder._id,
    isDeleted: { $ne: true },
  }).lean();
  if (!grns.length) throw new Error(`No GRNs found for ${poNumber}`);

  const receivedByLine = new Map<string, number>();
  for (const grn of grns) {
    for (const item of grn.items) {
      const key = lineKey(item.itemId, item.variantId);
      receivedByLine.set(
        key,
        (receivedByLine.get(key) ?? 0) + item.receivedQuantity,
      );
    }
  }

  for (const item of purchaseOrder.items) {
    item.receivedQuantity = receivedByLine.get(
      lineKey(item.itemId, item.variantId),
    ) ?? 0;
  }

  const fullyReceived = purchaseOrder.items.every(
    (item) => item.receivedQuantity >= item.quantity,
  );
  purchaseOrder.status = fullyReceived
    ? PurchaseOrderStatus.RECEIVED
    : PurchaseOrderStatus.PARTIALLY_RECEIVED;
  purchaseOrder.markModified("items");
  await purchaseOrder.save();

  let movementsCreated = 0;
  let auditsCreated = 0;
  for (const grn of grns) {
    for (const item of grn.items) {
      if (
        item.receivedQuantity <= 0 ||
        item.condition === GrnItemCondition.DAMAGED
      ) {
        continue;
      }

      const existingMovement = await StockMovementModel.exists({
        organizationId: purchaseOrder.organizationId,
        itemId: item.itemId,
        warehouseId: purchaseOrder.warehouseId,
        referenceType: StockReferenceType.GRN,
        referenceId: grn._id,
        isDeleted: { $ne: true },
      });
      if (existingMovement) continue;

      const [balance, batch] = await Promise.all([
        InventoryBalanceModel.findOne({
          organizationId: purchaseOrder.organizationId,
          itemId: item.itemId,
          warehouseId: purchaseOrder.warehouseId,
          isDeleted: { $ne: true },
        }).lean(),
        StockBatchModel.findOne({
          organizationId: purchaseOrder.organizationId,
          itemId: item.itemId,
          warehouseId: purchaseOrder.warehouseId,
          grnId: grn._id,
          isDeleted: { $ne: true },
        }).lean(),
      ]);

      await StockMovementModel.create({
        organizationId: purchaseOrder.organizationId,
        itemId: item.itemId,
        warehouseId: purchaseOrder.warehouseId,
        batchId: batch?._id,
        type: StockMovementType.INFLOW,
        quantity: item.receivedQuantity,
        balanceAfter: balance?.quantity ?? item.receivedQuantity,
        costPerUnit: item.unitCost ?? 0,
        totalCost: item.receivedQuantity * (item.unitCost ?? 0),
        referenceType: StockReferenceType.GRN,
        referenceId: grn._id,
        serialNumbers: item.serialNumbers ?? [],
        performedBy: grn.receivedBy,
        notes: grn.notes,
        occurredAt: grn.receivedAt,
      });
      movementsCreated += 1;
    }

    const existingAudit = await AuditLogModel.exists({
      organizationId: purchaseOrder.organizationId,
      action: "grn.create",
      entityType: "GoodsReceivedNote",
      entityId: grn._id,
      isDeleted: { $ne: true },
    });
    if (!existingAudit) {
      await AuditLogModel.create({
        organizationId: purchaseOrder.organizationId,
        actorId: grn.receivedBy,
        action: "grn.create",
        module: AuditModule.PURCHASE,
        entityType: "GoodsReceivedNote",
        entityId: grn._id,
        after: grn,
      });
      auditsCreated += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        poNumber: purchaseOrder.poNumber,
        status: purchaseOrder.status,
        grnCount: grns.length,
        movementsCreated,
        auditsCreated,
        items: purchaseOrder.items.map((item) => ({
          itemId: item.itemId,
          orderedQuantity: item.quantity,
          receivedQuantity: item.receivedQuantity,
        })),
      },
      null,
      2,
    ),
  );
};

void run()
  .finally(() => mongoose.disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
