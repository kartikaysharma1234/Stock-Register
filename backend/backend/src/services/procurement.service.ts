import mongoose from "mongoose";
import { Role } from "../constants/roles";
import { NotificationType, PurchaseOrderStatus } from "../constants/status";
import { procurementRepository } from "../repository/procurement.repository";
import { userRepository } from "../repository/user.repository";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { inventoryService } from "./inventory.service";
import { notificationService } from "./notification.service";

export class ProcurementService {
  private organizationId(actor: AuthUser) {
    if (!actor.organizationId) throw new ApiError(400, "Organization is required");
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

  createVendor(actor: AuthUser, data: Record<string, unknown>) {
    return procurementRepository.createVendor(this.organizationId(actor), data);
  }

  listVendors(actor: AuthUser) {
    return procurementRepository.listVendors(this.organizationId(actor));
  }

  updateVendor(actor: AuthUser, id: string, data: Record<string, unknown>) {
    return procurementRepository.updateVendor(
      this.organizationId(actor),
      id,
      data,
    );
  }

  createPurchaseOrder(
    actor: AuthUser,
    data: {
      vendorId: string;
      warehouseId: string;
      lines: Array<{
        itemId: string;
        orderedQuantity: number;
        unitPrice: number;
        taxRate?: number;
      }>;
      expectedDeliveryDate?: Date;
      notes?: string;
    },
  ) {
    this.assertWarehouseScope(actor, data.warehouseId);
    const lines = data.lines.map((line) => ({
      ...line,
      taxRate: line.taxRate ?? 0,
      receivedQuantity: 0,
    }));
    const subtotal = lines.reduce(
      (sum, line) => sum + line.orderedQuantity * line.unitPrice,
      0,
    );
    const taxTotal = lines.reduce(
      (sum, line) =>
        sum +
        line.orderedQuantity * line.unitPrice * (line.taxRate / 100),
      0,
    );
    return procurementRepository.createPurchaseOrder({
      ...data,
      lines,
      organizationId: this.organizationId(actor),
      poNumber: `PO-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      subtotal,
      taxTotal,
      total: subtotal + taxTotal,
      createdBy: actor.id,
      status: PurchaseOrderStatus.DRAFT,
    });
  }

  listPurchaseOrders(actor: AuthUser, status?: PurchaseOrderStatus) {
    return procurementRepository.listPurchaseOrders(
      this.organizationId(actor),
      status,
      [Role.SUB_ADMIN, Role.STORE_MANAGER].includes(actor.role)
        ? actor.warehouseIds
        : undefined,
    );
  }

  getPurchaseOrder(actor: AuthUser, id: string) {
    return procurementRepository.findPurchaseOrder(
      this.organizationId(actor),
      id,
    );
  }

  async submitPurchaseOrder(actor: AuthUser, id: string) {
    const organizationId = this.organizationId(actor);
    const po = await procurementRepository.updatePurchaseOrderStatus(
      organizationId,
      id,
      [PurchaseOrderStatus.DRAFT],
      { status: PurchaseOrderStatus.PENDING_APPROVAL },
    );
    if (!po) throw new ApiError(409, "Only draft purchase orders can be submitted");
    const approvers = await userRepository.findUsersForNotification(
      organizationId,
      [Role.ADMIN],
    );
    await notificationService.notifyMany(
      approvers.map((user) => user.id),
      {
        organizationId,
        type: NotificationType.PO_APPROVAL,
        title: `Purchase order ${po.poNumber} needs approval`,
        message: `${po.poNumber} is awaiting approval.`,
        template: "poApproval",
        variables: { poNumber: po.poNumber, total: po.total.toFixed(2) },
      },
    );
    return po;
  }

  async approvePurchaseOrder(actor: AuthUser, id: string) {
    const po = await procurementRepository.updatePurchaseOrderStatus(
      this.organizationId(actor),
      id,
      [PurchaseOrderStatus.PENDING_APPROVAL],
      {
        status: PurchaseOrderStatus.APPROVED,
        approvedBy: actor.id,
        approvedAt: new Date(),
      },
    );
    if (!po) throw new ApiError(409, "Purchase order is not pending approval");
    return po;
  }

  async rejectPurchaseOrder(actor: AuthUser, id: string, reason: string) {
    const po = await procurementRepository.updatePurchaseOrderStatus(
      this.organizationId(actor),
      id,
      [PurchaseOrderStatus.PENDING_APPROVAL],
      {
        status: PurchaseOrderStatus.REJECTED,
        rejectedBy: actor.id,
        rejectionReason: reason,
      },
    );
    if (!po) throw new ApiError(409, "Purchase order is not pending approval");
    return po;
  }

  async receiveGoods(
    actor: AuthUser,
    purchaseOrderId: string,
    data: {
      deliveryNoteNumber?: string;
      notes?: string;
      lines: Array<{
        itemId: string;
        quantity: number;
        batchNumber?: string;
        expiryDate?: Date;
        unitCost?: number;
      }>;
    },
  ) {
    const organizationId = this.organizationId(actor);
    const session = await mongoose.startSession();
    let grn;
    try {
      await session.withTransaction(async () => {
        const po = await procurementRepository.findPurchaseOrderForUpdate(
          organizationId,
          purchaseOrderId,
        ).session(session);
        if (
          !po ||
          ![
            PurchaseOrderStatus.APPROVED,
            PurchaseOrderStatus.PARTIALLY_RECEIVED,
          ].includes(po.status)
        ) {
          throw new ApiError(409, "Purchase order is not open for receiving");
        }
        this.assertWarehouseScope(actor, po.warehouseId.toString());
        for (const received of data.lines) {
          const ordered = po.lines.find(
            (line) => line.itemId.toString() === received.itemId,
          );
          if (
            !ordered ||
            ordered.receivedQuantity + received.quantity >
              ordered.orderedQuantity
          ) {
            throw new ApiError(400, "Received quantity exceeds purchase order");
          }
          ordered.receivedQuantity += received.quantity;
        }
        grn = await procurementRepository.createGrn(
          {
            ...data,
            organizationId,
            grnNumber: `GRN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            purchaseOrderId,
            warehouseId: po.warehouseId,
            receivedBy: actor.id,
            receivedAt: new Date(),
          },
          session,
        );
        for (const line of data.lines) {
          await inventoryService.stockIn(
            {
              organizationId,
              itemId: line.itemId,
              warehouseId: po.warehouseId.toString(),
              quantity: line.quantity,
              performedBy: actor.id,
              batchNumber: line.batchNumber,
              expiryDate: line.expiryDate,
              unitCost: line.unitCost,
              referenceType: "GoodsReceivedNote",
              referenceId: grn.id,
            },
            session,
          );
        }
        const fullyReceived = po.lines.every(
          (line) => line.receivedQuantity >= line.orderedQuantity,
        );
        po.status = fullyReceived
          ? PurchaseOrderStatus.RECEIVED
          : PurchaseOrderStatus.PARTIALLY_RECEIVED;
        await po.save({ session });
      });
    } finally {
      await session.endSession();
    }
    return grn;
  }

  listGrns(actor: AuthUser, purchaseOrderId?: string) {
    return procurementRepository.listGrns(
      this.organizationId(actor),
      purchaseOrderId,
      [Role.SUB_ADMIN, Role.STORE_MANAGER].includes(actor.role)
        ? actor.warehouseIds
        : undefined,
    );
  }
}

export const procurementService = new ProcurementService();
