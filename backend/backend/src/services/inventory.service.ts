import mongoose, { ClientSession } from "mongoose";
import { Role } from "../constants/roles";
import { NotificationType, StockMovementType } from "../constants/status";
import { inventoryRepository } from "../repository/inventory.repository";
import { userRepository } from "../repository/user.repository";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { auditService } from "./audit.service";
import { notificationService } from "./notification.service";

export interface StockChangeInput {
  organizationId: string;
  itemId: string;
  warehouseId: string;
  quantity: number;
  performedBy: string;
  departmentId?: string;
  batchNumber?: string;
  expiryDate?: Date;
  unitCost?: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
}

export class InventoryService {
  private assertOrganization(actor: AuthUser) {
    if (!actor.organizationId) {
      throw new ApiError(400, "Organization context is required");
    }
    return actor.organizationId;
  }

  private assertWarehouseScope(actor: AuthUser, warehouseId: string) {
    if (
      [Role.SUPER_ADMIN, Role.ADMIN].includes(actor.role) ||
      actor.warehouseIds.includes(warehouseId)
    ) {
      return;
    }
    throw new ApiError(403, "Warehouse is outside your assigned scope");
  }

  async createItem(actor: AuthUser, data: Record<string, unknown>) {
    const organizationId = this.assertOrganization(actor);
    const item = await inventoryRepository.createItem(organizationId, data);
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "item.create",
        entityType: "Item",
        entityId: item.id,
        after: item.toObject(),
      },
    );
    return item;
  }

  listItems(actor: AuthUser, filter: Parameters<typeof inventoryRepository.listItems>[1]) {
    return inventoryRepository.listItems(this.assertOrganization(actor), filter);
  }

  async updateItem(actor: AuthUser, id: string, data: Record<string, unknown>) {
    const organizationId = this.assertOrganization(actor);
    const before = await inventoryRepository.findItem(organizationId, id);
    if (!before) throw new ApiError(404, "Item not found");
    const item = await inventoryRepository.updateItem(organizationId, id, data);
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "item.update",
        entityType: "Item",
        entityId: id,
        before: before.toObject(),
        after: item?.toObject(),
      },
    );
    return item;
  }

  archiveItem(actor: AuthUser, id: string) {
    return inventoryRepository.archiveItem(this.assertOrganization(actor), id);
  }

  async listBalances(actor: AuthUser, warehouseId?: string) {
    if (warehouseId) this.assertWarehouseScope(actor, warehouseId);
    if (
      !warehouseId &&
      [Role.STORE_MANAGER, Role.SUB_ADMIN].includes(actor.role)
    ) {
      const groups = await Promise.all(
        actor.warehouseIds.map((id) =>
          inventoryRepository.listBalances(this.assertOrganization(actor), id),
        ),
      );
      return groups.flat();
    }
    return inventoryRepository.listBalances(
      this.assertOrganization(actor),
      warehouseId,
    );
  }

  async listLowStock(actor: AuthUser, warehouseId?: string) {
    if (warehouseId) this.assertWarehouseScope(actor, warehouseId);
    if (
      !warehouseId &&
      [Role.STORE_MANAGER, Role.SUB_ADMIN].includes(actor.role)
    ) {
      const groups = await Promise.all(
        actor.warehouseIds.map((id) =>
          inventoryRepository.listLowStock(this.assertOrganization(actor), id),
        ),
      );
      return groups.flat();
    }
    return inventoryRepository.listLowStock(
      this.assertOrganization(actor),
      warehouseId,
    );
  }

  async listMovements(
    actor: AuthUser,
    filter: Parameters<typeof inventoryRepository.listMovements>[1],
  ) {
    if (filter.warehouseId) {
      this.assertWarehouseScope(actor, filter.warehouseId);
    }
    if (
      !filter.warehouseId &&
      [Role.STORE_MANAGER, Role.SUB_ADMIN].includes(actor.role)
    ) {
      const groups = await Promise.all(
        actor.warehouseIds.map((warehouseId) =>
          inventoryRepository.listMovements(this.assertOrganization(actor), {
            ...filter,
            warehouseId,
          }),
        ),
      );
      return groups.flat().sort(
        (left, right) =>
          right.occurredAt.getTime() - left.occurredAt.getTime(),
      );
    }
    return inventoryRepository.listMovements(
      this.assertOrganization(actor),
      filter,
    );
  }

  async stockIn(input: StockChangeInput, session?: ClientSession) {
    const execute = async (activeSession: ClientSession) => {
      const item = await inventoryRepository.findItem(
        input.organizationId,
        input.itemId,
      );
      if (!item?.isActive) throw new ApiError(404, "Item not found");
      if (item.trackBatches && !input.batchNumber) {
        throw new ApiError(400, "Batch number is required for this item");
      }
      if (item.trackExpiry && !input.expiryDate) {
        throw new ApiError(400, "Expiry date is required for this item");
      }
      const balance = await inventoryRepository.incrementBalance(
        input.organizationId,
        input.itemId,
        input.warehouseId,
        input.quantity,
        activeSession,
      );
      let batchId: string | undefined;
      if (input.batchNumber) {
        const batch = await inventoryRepository.upsertBatch(
          {
            organizationId: input.organizationId,
            itemId: input.itemId,
            warehouseId: input.warehouseId,
            batchNumber: input.batchNumber,
            quantity: input.quantity,
            expiryDate: input.expiryDate,
            unitCost: input.unitCost,
            purchaseOrderId:
              input.referenceType === "PurchaseOrder"
                ? input.referenceId
                : undefined,
            grnId:
              input.referenceType === "GoodsReceivedNote"
                ? input.referenceId
                : undefined,
          },
          activeSession,
        );
        batchId = batch.id;
      }
      return inventoryRepository.createMovement(
        {
          ...input,
          batchId,
          type: StockMovementType.INFLOW,
          balanceAfter: balance.quantity,
        },
        activeSession,
      );
    };

    if (session) return execute(session);
    const ownSession = await mongoose.startSession();
    try {
      let result;
      await ownSession.withTransaction(async () => {
        result = await execute(ownSession);
      });
      return result;
    } finally {
      await ownSession.endSession();
    }
  }

  async stockOut(input: StockChangeInput, session?: ClientSession) {
    const execute = async (activeSession: ClientSession) => {
      const item = await inventoryRepository.findItem(
        input.organizationId,
        input.itemId,
      );
      if (!item?.isActive) throw new ApiError(404, "Item not found");
      const current = await inventoryRepository.findBalance(
        input.organizationId,
        input.itemId,
        input.warehouseId,
        activeSession,
      );
      if (!current || current.quantity < input.quantity) {
        throw new ApiError(409, `Insufficient stock for SKU ${item.sku}`);
      }
      const balance = await inventoryRepository.decrementBalance(
        input.organizationId,
        input.itemId,
        input.warehouseId,
        input.quantity,
        activeSession,
      );
      if (!balance) throw new ApiError(409, "Stock changed; retry the operation");

      if (!item.trackBatches) {
        await inventoryRepository.createMovement(
          {
            ...input,
            type: StockMovementType.OUTFLOW,
            balanceAfter: balance.quantity,
          },
          activeSession,
        );
        return { balance, item };
      }

      const batches = await inventoryRepository.findAvailableBatches(
        input.organizationId,
        input.itemId,
        input.warehouseId,
        activeSession,
      );
      let remaining = input.quantity;
      let consumed = 0;
      for (const batch of batches) {
        if (remaining <= 0) break;
        const quantity = Math.min(batch.quantity, remaining);
        const updated = await inventoryRepository.decrementBatch(
          batch.id,
          quantity,
          activeSession,
        );
        if (!updated) throw new ApiError(409, "Batch stock changed; retry");
        consumed += quantity;
        remaining -= quantity;
        await inventoryRepository.createMovement(
          {
            ...input,
            batchId: batch.id,
            quantity,
            type: StockMovementType.OUTFLOW,
            balanceAfter: current.quantity - consumed,
          },
          activeSession,
        );
      }
      if (remaining > 0) {
        throw new ApiError(409, "Insufficient non-expired batch stock");
      }
      return { balance, item };
    };

    let result;
    if (session) {
      result = await execute(session);
    } else {
      const ownSession = await mongoose.startSession();
      try {
        await ownSession.withTransaction(async () => {
          result = await execute(ownSession);
        });
      } finally {
        await ownSession.endSession();
      }
    }
    if (!session && result) {
      await this.sendLowStockAlert(
        input.organizationId,
        input.warehouseId,
        result.item.name,
        result.item.sku,
        result.balance.quantity,
        result.item.minStockThreshold,
      );
    }
    return result;
  }

  async manualStockIn(actor: AuthUser, data: Omit<StockChangeInput, "organizationId" | "performedBy">) {
    this.assertWarehouseScope(actor, data.warehouseId);
    return this.stockIn({
      ...data,
      organizationId: this.assertOrganization(actor),
      performedBy: actor.id,
    });
  }

  async manualStockOut(actor: AuthUser, data: Omit<StockChangeInput, "organizationId" | "performedBy">) {
    this.assertWarehouseScope(actor, data.warehouseId);
    return this.stockOut({
      ...data,
      organizationId: this.assertOrganization(actor),
      performedBy: actor.id,
    });
  }

  async sendLowStockAlert(
    organizationId: string,
    warehouseId: string,
    itemName: string,
    sku: string,
    quantity: number,
    threshold: number,
  ) {
    if (quantity > threshold) return;
    const users = await userRepository.findUsersForNotification(
      organizationId,
      [Role.ADMIN, Role.STORE_MANAGER],
      warehouseId,
    );
    await notificationService.notifyMany(
      users.map((user) => user.id),
      {
        organizationId,
        type: NotificationType.LOW_STOCK,
        title: `Low stock alert: ${itemName}`,
        message: `${itemName} (${sku}) has ${quantity} remaining.`,
        template: "lowStockAlert",
        variables: { itemName, sku, quantity, threshold },
      },
    );
  }

  async alertLowStockForWarehouse(
    organizationId: string,
    warehouseId: string,
  ) {
    const rows = await inventoryRepository.listLowStock(
      organizationId,
      warehouseId,
    );
    for (const row of rows) {
      await this.sendLowStockAlert(
        organizationId,
        warehouseId,
        String(row.item.name),
        String(row.item.sku),
        Number(row.quantity),
        Number(row.effectiveThreshold),
      );
    }
  }
}

export const inventoryService = new InventoryService();
