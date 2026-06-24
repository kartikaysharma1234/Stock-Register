import { HydratedDocument } from "mongoose";
import {
  CounterType,
  GrnItemCondition,
  NotificationType,
  PaymentMode,
  PaymentTerm,
  PurchaseOrderStatus,
  Role,
  StockReferenceType,
} from "../constants";
import { counterRepository } from "../repository/counter.repository";
import {
  AttachmentInput,
  GrnListFilter,
  PaymentListFilter,
  ProcurementRepository,
  PurchaseOrderItemRecord,
  PurchaseOrderListFilter,
  VendorListFilter,
  procurementRepository,
} from "../repository/procurement.repository";
import { IPurchaseOrder, IVendorAddress, IVendorBankDetails } from "../repository/schemas";
import { userRepository } from "../repository/user.repository";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { runWithOptionalTransaction } from "../utils/mongo-transaction";
import { auditService } from "./audit.service";
import { inventoryService } from "./inventory.service";
import { notificationService } from "./notification.service";

export interface VendorInput {
  organizationId?: string;
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: IVendorAddress;
  taxId?: string;
  gstin?: string;
  panNumber?: string;
  bankDetails?: IVendorBankDetails;
  paymentTerms?: PaymentTerm;
  isActive?: boolean;
}

export interface PurchaseOrderItemInput {
  itemId: string;
  variantId?: string;
  quantity: number;
  unitCost: number;
  taxRate?: number;
  expectedDeliveryDate?: Date;
  notes?: string;
}

export interface PurchaseOrderInput {
  organizationId?: string;
  vendorId: string;
  warehouseId: string;
  items: PurchaseOrderItemInput[];
  discountAmount?: number;
  expectedDeliveryDate?: Date;
  notes?: string;
  attachments?: AttachmentInput[];
}

export interface PurchaseOrderUpdateInput {
  organizationId?: string;
  vendorId?: string;
  warehouseId?: string;
  items?: PurchaseOrderItemInput[];
  discountAmount?: number;
  expectedDeliveryDate?: Date;
  notes?: string;
  attachments?: AttachmentInput[];
}

export interface GrnItemInput {
  itemId: string;
  variantId?: string;
  receivedQuantity: number;
  rejectedQuantity?: number;
  batchNumber?: string;
  serialNumbers?: string[];
  manufacturingDate?: Date;
  expiryDate?: Date;
  unitCost?: number;
  condition?: GrnItemCondition;
}

export interface GrnInput {
  deliveryNoteNumber?: string;
  invoiceNumber?: string;
  invoiceDate?: Date;
  invoiceAmount?: number;
  qualityCheckPassed?: boolean;
  qualityNotes?: string;
  notes?: string;
  attachments?: AttachmentInput[];
  items: GrnItemInput[];
}

export interface PaymentInput {
  organizationId?: string;
  vendorId: string;
  purchaseOrderId?: string;
  amount: number;
  paymentDate: Date;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  notes?: string;
  attachments?: AttachmentInput[];
}

export interface VendorCompareFilter {
  organizationId?: string;
  itemId?: string;
  from?: Date;
  to?: Date;
}

type PurchaseOrderDocument = HydratedDocument<IPurchaseOrder>;

const scopedWarehouseRoles = new Set<Role>([
  Role.SUB_ADMIN,
  Role.STORE_MANAGER,
  Role.VIEWER,
]);

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const itemKey = (itemId: string, variantId?: string) =>
  `${itemId}:${variantId ?? ""}`;

const documentItemKey = (item: IPurchaseOrder["items"][number]) =>
  itemKey(item.itemId.toString(), item.variantId?.toString());

export class ProcurementService {
  constructor(
    private readonly repository: ProcurementRepository = procurementRepository,
  ) {}

  private organizationId(actor: AuthUser, requestedOrganizationId?: string) {
    if (actor.role === Role.SUPER_ADMIN) {
      if (!requestedOrganizationId) {
        throw new ApiError(400, "organizationId is required");
      }
      return requestedOrganizationId;
    }
    if (!actor.organizationId) {
      throw new ApiError(400, "Organization context is required");
    }
    if (
      requestedOrganizationId &&
      requestedOrganizationId !== actor.organizationId
    ) {
      throw new ApiError(403, "Organization context mismatch");
    }
    return actor.organizationId;
  }

  private actorWarehouseIds(actor: AuthUser) {
    return [
      ...new Set([
        ...actor.warehouseIds,
        ...(actor.warehouseId ? [actor.warehouseId] : []),
      ]),
    ];
  }

  private isAdmin(actor: AuthUser) {
    return [Role.ADMIN, Role.SUPER_ADMIN].includes(actor.role);
  }

  private assertWarehouseScope(actor: AuthUser, warehouseId: string) {
    if (this.isAdmin(actor)) return;
    if (this.actorWarehouseIds(actor).includes(warehouseId)) return;
    throw new ApiError(403, "Warehouse is outside your assigned scope");
  }

  private scopedPurchaseFilter(
    actor: AuthUser,
    filter: PurchaseOrderListFilter,
  ): PurchaseOrderListFilter {
    if (!scopedWarehouseRoles.has(actor.role)) return filter;
    const warehouseIds = this.actorWarehouseIds(actor);
    return warehouseIds.length ? { ...filter, warehouseIds } : filter;
  }

  private scopedGrnFilter(actor: AuthUser, filter: GrnListFilter): GrnListFilter {
    if (!scopedWarehouseRoles.has(actor.role)) return filter;
    const warehouseIds = this.actorWarehouseIds(actor);
    return warehouseIds.length ? { ...filter, warehouseIds } : filter;
  }

  private assertPurchaseAccess(actor: AuthUser, po: PurchaseOrderDocument) {
    if (!scopedWarehouseRoles.has(actor.role)) return;
    const warehouseIds = this.actorWarehouseIds(actor);
    if (
      warehouseIds.length &&
      !warehouseIds.includes(po.warehouseId.toString())
    ) {
      throw new ApiError(403, "Purchase order is outside your assigned scope");
    }
  }

  private async purchaseOrderForMutation(
    actor: AuthUser,
    organizationId: string,
    id: string,
  ) {
    const purchaseOrder = await this.repository.findPurchaseOrderDocument(
      organizationId,
      id,
    );
    if (!purchaseOrder) throw new ApiError(404, "Purchase order not found");
    this.assertPurchaseAccess(actor, purchaseOrder);
    return purchaseOrder;
  }

  private buildPurchaseItems(
    items: PurchaseOrderItemInput[],
  ): PurchaseOrderItemRecord[] {
    return items.map((item) => {
      const quantity = item.quantity;
      const unitCost = item.unitCost;
      const taxRate = item.taxRate ?? 0;
      return {
        itemId: item.itemId,
        variantId: item.variantId,
        quantity,
        receivedQuantity: 0,
        unitCost,
        taxRate,
        totalCost: roundMoney(quantity * unitCost),
        expectedDeliveryDate: item.expectedDeliveryDate,
        notes: item.notes,
      };
    });
  }

  private totals(items: PurchaseOrderItemRecord[], discountAmount = 0) {
    const subTotal = roundMoney(
      items.reduce((sum, item) => sum + item.totalCost, 0),
    );
    const taxAmount = roundMoney(
      items.reduce(
        (sum, item) => sum + item.totalCost * ((item.taxRate ?? 0) / 100),
        0,
      ),
    );
    if (discountAmount > subTotal + taxAmount) {
      throw new ApiError(422, "Discount cannot exceed purchase order total");
    }
    return {
      subTotal,
      taxAmount,
      discountAmount: roundMoney(discountAmount),
      totalAmount: roundMoney(subTotal + taxAmount - discountAmount),
    };
  }

  private async assertVendor(organizationId: string, vendorId: string) {
    const vendor = await this.repository.findVendor(organizationId, vendorId);
    if (!vendor?.isActive) throw new ApiError(404, "Vendor not found");
    return vendor;
  }

  private async notifyRoles(
    organizationId: string,
    roles: Role[],
    data: {
      type: NotificationType;
      title: string;
      message: string;
      template: string;
      variables: Record<string, string | number>;
    },
    warehouseId?: string,
  ) {
    const users = await userRepository.findUsersForNotification(
      organizationId,
      roles,
      warehouseId,
    );
    if (!users.length) return [];
    return notificationService.notifyMany(
      users.map((user) => user.id),
      { organizationId, ...data },
    );
  }

  private receiptScore(
    po: PurchaseOrderDocument,
    grn: GrnInput,
    receivedAt: Date,
  ) {
    const expected = po.expectedDeliveryDate;
    const onTimeScore = expected && receivedAt > expected ? 3 : 5;
    const qualityScore = grn.qualityCheckPassed === false
      ? 2
      : grn.items.some((item) => item.condition === GrnItemCondition.DAMAGED)
        ? 3
        : grn.items.some((item) => item.condition === GrnItemCondition.PARTIAL)
          ? 4
          : 5;
    return roundMoney((onTimeScore + qualityScore) / 2);
  }

  async createVendor(actor: AuthUser, data: VendorInput) {
    const organizationId = this.organizationId(actor, data.organizationId);
    const vendor = await this.repository.createVendor({
      organizationId,
      name: data.name,
      code: data.code,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      address: data.address,
      taxId: data.taxId,
      gstin: data.gstin,
      panNumber: data.panNumber,
      bankDetails: data.bankDetails,
      paymentTerms: data.paymentTerms,
      isActive: data.isActive,
    });
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "vendor.create",
        entityType: "Vendor",
        entityId: vendor.id,
        after: vendor.toObject(),
      },
    );
    return vendor;
  }

  listVendors(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    filter: VendorListFilter,
  ) {
    return this.repository.listVendors(
      this.organizationId(actor, requestedOrganizationId),
      filter,
    );
  }

  async getVendor(
    actor: AuthUser,
    id: string,
    requestedOrganizationId?: string,
  ) {
    const vendor = await this.repository.findVendor(
      this.organizationId(actor, requestedOrganizationId),
      id,
    );
    if (!vendor) throw new ApiError(404, "Vendor not found");
    return vendor;
  }

  async updateVendor(
    actor: AuthUser,
    id: string,
    data: Partial<VendorInput>,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId ?? data.organizationId,
    );
    const before = await this.repository.findVendor(organizationId, id);
    if (!before) throw new ApiError(404, "Vendor not found");
    const update: Record<string, unknown> = { ...data };
    delete update.organizationId;
    const vendor = await this.repository.updateVendor(organizationId, id, update);
    if (!vendor) throw new ApiError(404, "Vendor not found");
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "vendor.update",
        entityType: "Vendor",
        entityId: id,
        before: before.toObject(),
        after: vendor.toObject(),
      },
    );
    return vendor;
  }

  async deleteVendor(
    actor: AuthUser,
    id: string,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    const vendor = await this.repository.findVendor(organizationId, id);
    if (!vendor) throw new ApiError(404, "Vendor not found");
    const openOrders = await this.repository.countVendorOpenPurchaseOrders(
      organizationId,
      id,
    );
    if (openOrders) {
      throw new ApiError(
        409,
        "Vendor cannot be deleted while open purchase orders exist",
      );
    }
    await this.repository.softDeleteVendor(organizationId, id, actor.id);
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "vendor.delete",
        entityType: "Vendor",
        entityId: id,
        before: vendor.toObject(),
      },
    );
  }

  listVendorOrders(
    actor: AuthUser,
    id: string,
    requestedOrganizationId: string | undefined,
    filter: PurchaseOrderListFilter,
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    return this.repository.listVendorOrders(
      organizationId,
      id,
      this.scopedPurchaseFilter(actor, filter),
    );
  }

  listVendorPayments(
    actor: AuthUser,
    id: string,
    requestedOrganizationId: string | undefined,
    filter: PaymentListFilter,
  ) {
    return this.repository.listVendorPayments(
      this.organizationId(actor, requestedOrganizationId),
      id,
      filter,
    );
  }

  async compareVendors(actor: AuthUser, filter: VendorCompareFilter) {
    const organizationId = this.organizationId(actor, filter.organizationId);
    const [vendorsPage, history] = await Promise.all([
      this.repository.listVendors(organizationId, {
        isActive: true,
        limit: 100,
        sortBy: "rating",
        sortOrder: "desc",
      }),
      filter.itemId
        ? this.repository.purchaseHistoryForItem(
            organizationId,
            filter.itemId,
            filter.from,
            filter.to,
          )
        : Promise.resolve([]),
    ]);
    const historyByVendor = new Map(
      history.map((row) => [row.vendorId.toString(), row]),
    );
    const vendors = vendorsPage.vendors
      .map((vendor) => {
        const row = historyByVendor.get(vendor.id);
        const costScore = row?.avgUnitCost
          ? Math.max(0, 1000 / (row.avgUnitCost + 1))
          : 0;
        const score = roundMoney(
          vendor.rating * 20 + Math.min(vendor.totalOrders, 50) + costScore,
        );
        return {
          vendorId: vendor.id,
          name: vendor.name,
          code: vendor.code,
          rating: vendor.rating,
          paymentTerms: vendor.paymentTerms,
          totalOrders: vendor.totalOrders,
          totalAmount: vendor.totalAmount,
          avgUnitCost: row?.avgUnitCost ? roundMoney(row.avgUnitCost) : null,
          totalQuantity: row?.totalQuantity ?? 0,
          orderCount: row?.orderCount ?? 0,
          lastPurchaseAt: row?.lastPurchaseAt ?? null,
          score,
        };
      })
      .sort((left, right) => right.score - left.score);
    return { vendors };
  }

  async createPurchaseOrder(actor: AuthUser, data: PurchaseOrderInput) {
    const organizationId = this.organizationId(actor, data.organizationId);
    this.assertWarehouseScope(actor, data.warehouseId);
    await this.assertVendor(organizationId, data.vendorId);
    const items = this.buildPurchaseItems(data.items);
    const totals = this.totals(items, data.discountAmount);
    const poNumber = await counterRepository.nextNumber(
      organizationId,
      CounterType.PURCHASE_ORDER,
    );
    const purchaseOrder = await this.repository.createPurchaseOrder({
      organizationId,
      poNumber,
      vendorId: data.vendorId,
      warehouseId: data.warehouseId,
      status: PurchaseOrderStatus.DRAFT,
      items,
      ...totals,
      expectedDeliveryDate: data.expectedDeliveryDate,
      notes: data.notes,
      attachments: data.attachments,
      createdBy: actor.id,
    });
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "purchase_order.create",
        entityType: "PurchaseOrder",
        entityId: purchaseOrder.id,
        after: purchaseOrder.toObject(),
      },
    );
    return purchaseOrder;
  }

  listPurchaseOrders(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    filter: PurchaseOrderListFilter,
  ) {
    return this.repository.listPurchaseOrders(
      this.organizationId(actor, requestedOrganizationId),
      this.scopedPurchaseFilter(actor, filter),
    );
  }

  async getPurchaseOrder(
    actor: AuthUser,
    id: string,
    requestedOrganizationId?: string,
  ) {
    const purchaseOrder = await this.repository.findPurchaseOrder(
      this.organizationId(actor, requestedOrganizationId),
      id,
    );
    if (!purchaseOrder) throw new ApiError(404, "Purchase order not found");
    this.assertPurchaseAccess(actor, purchaseOrder);
    return purchaseOrder;
  }

  async updatePurchaseOrder(
    actor: AuthUser,
    id: string,
    data: PurchaseOrderUpdateInput,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId ?? data.organizationId,
    );
    const before = await this.repository.findPurchaseOrderDocument(
      organizationId,
      id,
    );
    if (!before) throw new ApiError(404, "Purchase order not found");
    this.assertPurchaseAccess(actor, before);
    if (
      ![
        PurchaseOrderStatus.DRAFT,
        PurchaseOrderStatus.PENDING_APPROVAL,
      ].includes(before.status)
    ) {
      throw new ApiError(409, "Only draft or pending purchase orders can be updated");
    }
    const warehouseId = data.warehouseId ?? before.warehouseId.toString();
    this.assertWarehouseScope(actor, warehouseId);
    if (data.vendorId) await this.assertVendor(organizationId, data.vendorId);
    const currentItems = before.items.map((item) => ({
      itemId: item.itemId.toString(),
      variantId: item.variantId?.toString(),
      quantity: item.quantity,
      receivedQuantity: item.receivedQuantity,
      unitCost: item.unitCost,
      taxRate: item.taxRate,
      totalCost: item.totalCost,
      expectedDeliveryDate: item.expectedDeliveryDate,
      notes: item.notes,
    }));
    const items = data.items
      ? this.buildPurchaseItems(data.items)
      : currentItems;
    if (items.some((item) => item.receivedQuantity > 0)) {
      throw new ApiError(409, "Received purchase order lines cannot be changed");
    }
    const totals = this.totals(
      items,
      data.discountAmount ?? before.discountAmount,
    );
    const update: Record<string, unknown> = {
      ...totals,
      ...(data.vendorId ? { vendorId: data.vendorId } : {}),
      ...(data.warehouseId ? { warehouseId: data.warehouseId } : {}),
      ...(data.items ? { items } : {}),
      ...(data.expectedDeliveryDate !== undefined
        ? { expectedDeliveryDate: data.expectedDeliveryDate }
        : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.attachments !== undefined ? { attachments: data.attachments } : {}),
    };
    const purchaseOrder = await this.repository.updatePurchaseOrder(
      organizationId,
      id,
      update,
    );
    if (!purchaseOrder) throw new ApiError(404, "Purchase order not found");
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "purchase_order.update",
        entityType: "PurchaseOrder",
        entityId: id,
        before: before.toObject(),
        after: purchaseOrder.toObject(),
      },
    );
    return purchaseOrder;
  }

  async submitPurchaseOrder(
    actor: AuthUser,
    id: string,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    await this.purchaseOrderForMutation(actor, organizationId, id);
    const purchaseOrder = await this.repository.updatePurchaseOrderStatus(
      organizationId,
      id,
      [PurchaseOrderStatus.DRAFT],
      { status: PurchaseOrderStatus.PENDING_APPROVAL },
    );
    if (!purchaseOrder) {
      throw new ApiError(409, "Only draft purchase orders can be submitted");
    }
    await this.notifyRoles(
      organizationId,
      [Role.ADMIN, Role.SUB_ADMIN],
      {
        type: NotificationType.PO_APPROVAL,
        title: `Purchase order ${purchaseOrder.poNumber} needs approval`,
        message: `${purchaseOrder.poNumber} is awaiting approval.`,
        template: "poApproval",
        variables: {
          poNumber: purchaseOrder.poNumber,
          total: purchaseOrder.totalAmount.toFixed(2),
        },
      },
      purchaseOrder.warehouseId.toString(),
    );
    return purchaseOrder;
  }

  async approvePurchaseOrder(
    actor: AuthUser,
    id: string,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    await this.purchaseOrderForMutation(actor, organizationId, id);
    const purchaseOrder = await this.repository.updatePurchaseOrderStatus(
      organizationId,
      id,
      [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.PENDING_APPROVAL],
      {
        status: PurchaseOrderStatus.APPROVED,
        approvedBy: actor.id,
        approvedAt: new Date(),
      },
    );
    if (!purchaseOrder) {
      throw new ApiError(409, "Purchase order is not ready for approval");
    }
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "purchase_order.approve",
        entityType: "PurchaseOrder",
        entityId: id,
        after: purchaseOrder.toObject(),
      },
    );
    await this.notifyRoles(
      organizationId,
      [Role.ADMIN, Role.SUB_ADMIN, Role.STORE_MANAGER],
      {
        type: NotificationType.PO_UPDATE,
        title: `Purchase order ${purchaseOrder.poNumber} approved`,
        message: `${purchaseOrder.poNumber} has been approved.`,
        template: "poStatus",
        variables: {
          poNumber: purchaseOrder.poNumber,
          status: "approved",
          total: purchaseOrder.totalAmount.toFixed(2),
        },
      },
      purchaseOrder.warehouseId.toString(),
    );
    return purchaseOrder;
  }

  async rejectPurchaseOrder(
    actor: AuthUser,
    id: string,
    reason: string,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    await this.purchaseOrderForMutation(actor, organizationId, id);
    const purchaseOrder = await this.repository.updatePurchaseOrderStatus(
      organizationId,
      id,
      [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.PENDING_APPROVAL],
      {
        status: PurchaseOrderStatus.REJECTED,
        rejectedBy: actor.id,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    );
    if (!purchaseOrder) {
      throw new ApiError(409, "Purchase order is not ready for rejection");
    }
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "purchase_order.reject",
        entityType: "PurchaseOrder",
        entityId: id,
        after: purchaseOrder.toObject(),
      },
    );
    return purchaseOrder;
  }

  async sendPurchaseOrder(
    actor: AuthUser,
    id: string,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    await this.purchaseOrderForMutation(actor, organizationId, id);
    const purchaseOrder = await this.repository.updatePurchaseOrderStatus(
      organizationId,
      id,
      [PurchaseOrderStatus.APPROVED],
      {
        status: PurchaseOrderStatus.SENT_TO_VENDOR,
        sentToVendorAt: new Date(),
      },
    );
    if (!purchaseOrder) {
      throw new ApiError(409, "Only approved purchase orders can be sent");
    }
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "purchase_order.send",
        entityType: "PurchaseOrder",
        entityId: id,
        after: purchaseOrder.toObject(),
      },
    );
    await this.notifyRoles(
      organizationId,
      [Role.ADMIN, Role.SUB_ADMIN, Role.STORE_MANAGER],
      {
        type: NotificationType.PO_UPDATE,
        title: `Purchase order ${purchaseOrder.poNumber} sent to vendor`,
        message: `${purchaseOrder.poNumber} has been sent to the vendor.`,
        template: "poStatus",
        variables: {
          poNumber: purchaseOrder.poNumber,
          status: "sent to vendor",
          total: purchaseOrder.totalAmount.toFixed(2),
        },
      },
      purchaseOrder.warehouseId.toString(),
    );
    return purchaseOrder;
  }

  async cancelPurchaseOrder(
    actor: AuthUser,
    id: string,
    reason?: string,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    await this.purchaseOrderForMutation(actor, organizationId, id);
    const purchaseOrder = await this.repository.updatePurchaseOrderStatus(
      organizationId,
      id,
      [
        PurchaseOrderStatus.DRAFT,
        PurchaseOrderStatus.PENDING_APPROVAL,
        PurchaseOrderStatus.APPROVED,
        PurchaseOrderStatus.SENT_TO_VENDOR,
      ],
      {
        status: PurchaseOrderStatus.CANCELLED,
        cancelledBy: actor.id,
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    );
    if (!purchaseOrder) {
      throw new ApiError(409, "Purchase order cannot be cancelled");
    }
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "purchase_order.cancel",
        entityType: "PurchaseOrder",
        entityId: id,
        metadata: { reason },
        after: purchaseOrder.toObject(),
      },
    );
    return purchaseOrder;
  }

  async createGrn(
    actor: AuthUser,
    purchaseOrderId: string,
    data: GrnInput,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    const createdGrnId = await runWithOptionalTransaction(
      async (session) => {
        const purchaseOrder = await this.repository.findPurchaseOrderDocument(
          organizationId,
          purchaseOrderId,
          session,
        );
        if (!purchaseOrder) throw new ApiError(404, "Purchase order not found");
        this.assertPurchaseAccess(actor, purchaseOrder);
        this.assertWarehouseScope(actor, purchaseOrder.warehouseId.toString());
        if (
          ![
            PurchaseOrderStatus.APPROVED,
            PurchaseOrderStatus.SENT_TO_VENDOR,
            PurchaseOrderStatus.PARTIALLY_RECEIVED,
          ].includes(purchaseOrder.status)
        ) {
          throw new ApiError(409, "Purchase order is not open for receiving");
        }
        const linesByKey = new Map(
          purchaseOrder.items.map((item) => [documentItemKey(item), item]),
        );
        const grnItems = data.items.map((received) => {
          const ordered = linesByKey.get(
            itemKey(received.itemId, received.variantId),
          );
          if (!ordered) {
            throw new ApiError(400, "Received item is not part of purchase order");
          }
          const receivedQuantity = received.receivedQuantity;
          const rejectedQuantity = received.rejectedQuantity ?? 0;
          if (
            ordered.receivedQuantity + receivedQuantity + rejectedQuantity >
            ordered.quantity
          ) {
            throw new ApiError(400, "Received quantity exceeds purchase order");
          }
          ordered.receivedQuantity = roundMoney(
            ordered.receivedQuantity + receivedQuantity,
          );
          return {
            itemId: received.itemId,
            variantId: received.variantId,
            orderedQuantity: ordered.quantity,
            receivedQuantity,
            rejectedQuantity,
            batchNumber: received.batchNumber,
            serialNumbers: received.serialNumbers ?? [],
            manufacturingDate: received.manufacturingDate,
            expiryDate: received.expiryDate,
            unitCost: received.unitCost ?? ordered.unitCost,
            condition: received.condition ?? GrnItemCondition.GOOD,
          };
        });
        const now = new Date();
        const grnNumber = await counterRepository.nextNumber(
          organizationId,
          CounterType.GRN,
          session,
          now,
        );
        const grn = await this.repository.createGrn(
          {
            organizationId,
            grnNumber,
            purchaseOrderId,
            vendorId: purchaseOrder.vendorId.toString(),
            warehouseId: purchaseOrder.warehouseId.toString(),
            receivedBy: actor.id,
            receivedAt: now,
            items: grnItems,
            deliveryNoteNumber: data.deliveryNoteNumber,
            invoiceNumber: data.invoiceNumber,
            invoiceDate: data.invoiceDate,
            invoiceAmount: data.invoiceAmount,
            qualityCheckPassed: data.qualityCheckPassed,
            qualityNotes: data.qualityNotes,
            notes: data.notes,
            attachments: data.attachments,
          },
          session,
        );
        for (const line of grnItems) {
          if (
            line.receivedQuantity <= 0 ||
            line.condition === GrnItemCondition.DAMAGED
          ) {
            continue;
          }
          await inventoryService.stockIn(
            {
              organizationId,
              itemId: line.itemId,
              warehouseId: purchaseOrder.warehouseId.toString(),
              quantity: line.receivedQuantity,
              performedBy: actor.id,
              batchNumber: line.batchNumber,
              serialNumbers: line.serialNumbers,
              manufacturingDate: line.manufacturingDate,
              expiryDate: line.expiryDate,
              unitCost: line.unitCost,
              referenceType: StockReferenceType.GRN,
              referenceId: grn.id,
              notes: data.notes,
            },
            session,
          );
        }
        const fullyReceived = purchaseOrder.items.every(
          (item) => item.receivedQuantity >= item.quantity,
        );
        const nextStatus = fullyReceived
          ? PurchaseOrderStatus.RECEIVED
          : PurchaseOrderStatus.PARTIALLY_RECEIVED;
        const updatedPurchaseOrder = await this.repository.updatePurchaseOrder(
          organizationId,
          purchaseOrder.id,
          {
            items: purchaseOrder.items.map((item) => ({
              itemId: item.itemId,
              variantId: item.variantId,
              quantity: item.quantity,
              receivedQuantity: item.receivedQuantity,
              unitCost: item.unitCost,
              taxRate: item.taxRate,
              totalCost: item.totalCost,
              expectedDeliveryDate: item.expectedDeliveryDate,
              notes: item.notes,
            })),
            status: nextStatus,
          },
          session,
        );
        if (!updatedPurchaseOrder) {
          throw new ApiError(409, "Purchase order receipt state changed");
        }
        if (fullyReceived && !purchaseOrder.vendorStatsCounted) {
          const vendor = await this.repository.findVendor(
            organizationId,
            purchaseOrder.vendorId.toString(),
          );
          if (vendor) {
            const score = this.receiptScore(purchaseOrder, data, now);
            const rating = roundMoney(
              ((vendor.rating || 0) * vendor.totalOrders + score) /
                (vendor.totalOrders + 1),
            );
            const counted = await this.repository.markVendorStatsCounted(
              organizationId,
              purchaseOrder.id,
              session,
            );
            if (counted) {
              await this.repository.updateVendorStats(
                organizationId,
                purchaseOrder.vendorId.toString(),
                purchaseOrder.totalAmount,
                Math.min(5, rating),
                session,
              );
            }
          }
        }
        await auditService.record(
          { actorId: actor.id, organizationId },
          {
            action: "grn.create",
            entityType: "GoodsReceivedNote",
            entityId: grn.id,
            after: grn.toObject(),
          },
        );
        return grn.id;
      },
    );
    const grn = await this.repository.findGrn(organizationId, createdGrnId);
    if (!grn) throw new ApiError(500, "GRN was not found after creation");
    await this.notifyRoles(
      organizationId,
      [Role.ADMIN, Role.SUB_ADMIN, Role.STORE_MANAGER],
      {
        type: NotificationType.PO_UPDATE,
        title: `Goods received for ${grn.grnNumber}`,
        message: `${grn.grnNumber} has been recorded.`,
        template: "poStatus",
        variables: {
          poNumber: grn.grnNumber,
          status: "received",
          total: String(data.invoiceAmount ?? 0),
        },
      },
      grn.warehouseId.toString(),
    );
    return grn;
  }

  receiveGoods(actor: AuthUser, purchaseOrderId: string, data: GrnInput) {
    return this.createGrn(actor, purchaseOrderId, data);
  }

  listGrns(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    filter: GrnListFilter,
  ) {
    return this.repository.listGrns(
      this.organizationId(actor, requestedOrganizationId),
      this.scopedGrnFilter(actor, filter),
    );
  }

  async getGrn(actor: AuthUser, id: string, requestedOrganizationId?: string) {
    const grn = await this.repository.findGrn(
      this.organizationId(actor, requestedOrganizationId),
      id,
    );
    if (!grn) throw new ApiError(404, "GRN not found");
    if (
      scopedWarehouseRoles.has(actor.role) &&
      this.actorWarehouseIds(actor).length
    ) {
      this.assertWarehouseScope(actor, grn.warehouseId.toString());
    }
    return grn;
  }

  async recordPayment(actor: AuthUser, data: PaymentInput) {
    const organizationId = this.organizationId(actor, data.organizationId);
    await this.assertVendor(organizationId, data.vendorId);
    if (data.purchaseOrderId) {
      const purchaseOrder = await this.repository.findPurchaseOrderDocument(
        organizationId,
        data.purchaseOrderId,
      );
      if (!purchaseOrder) throw new ApiError(404, "Purchase order not found");
      if (purchaseOrder.vendorId.toString() !== data.vendorId) {
        throw new ApiError(422, "Payment vendor must match purchase order vendor");
      }
      this.assertPurchaseAccess(actor, purchaseOrder);
    }
    const payment = await this.repository.createPayment({
      organizationId,
      vendorId: data.vendorId,
      purchaseOrderId: data.purchaseOrderId,
      amount: data.amount,
      paymentDate: data.paymentDate,
      paymentMode: data.paymentMode,
      referenceNumber: data.referenceNumber,
      notes: data.notes,
      attachments: data.attachments,
      recordedBy: actor.id,
    });
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "payment.create",
        entityType: "Payment",
        entityId: payment.id,
        after: payment.toObject(),
      },
    );
    return payment;
  }

  listPayments(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    filter: PaymentListFilter,
  ) {
    return this.repository.listPayments(
      this.organizationId(actor, requestedOrganizationId),
      filter,
    );
  }
}

export const procurementService = new ProcurementService();
