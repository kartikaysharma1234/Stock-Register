import mongoose, { ClientSession, Types } from "mongoose";
import {
  ItemUnit,
  NotificationType,
  Role,
  StockMovementType,
  StockReferenceType,
  ValuationMethod,
} from "../constants";
import {
  BatchListFilter,
  CategoryListFilter,
  ItemListFilter,
  MovementListFilter,
  PaginationOptions,
  StockListFilter,
  inventoryRepository,
} from "../repository/inventory.repository";
import { procurementRepository } from "../repository/procurement.repository";
import {
  IBundleComponent,
  IItemVariant,
} from "../repository/schemas";
import { userRepository } from "../repository/user.repository";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { auditService } from "./audit.service";
import { notificationService } from "./notification.service";

export interface ItemInput {
  organizationId?: string;
  name: string;
  sku: string;
  categoryId: string;
  unit: ItemUnit;
  description?: string;
  barcode?: string;
  qrCode?: string;
  variants?: Array<Omit<IItemVariant, "_id">>;
  isBundled?: boolean;
  bundleComponents?: Array<{
    itemId: string;
    quantity: number;
  }>;
  minStockThreshold?: number;
  maxStockThreshold?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  preferredVendorId?: string;
  valuationMethod?: ValuationMethod;
  hsnCode?: string;
  gstRate?: number;
  images?: string[];
  isAsset?: boolean;
  trackBatches?: boolean;
  trackExpiry?: boolean;
  isActive?: boolean;
}

export interface CategoryInput {
  organizationId?: string;
  name: string;
  code: string;
  parentCategoryId?: string | null;
  description?: string;
  isActive?: boolean;
}

export interface StockChangeInput {
  organizationId: string;
  itemId: string;
  warehouseId: string;
  zoneId?: string;
  quantity: number;
  performedBy: string;
  departmentId?: string;
  batchNumber?: string;
  serialNumbers?: string[];
  manufacturingDate?: Date;
  expiryDate?: Date;
  unitCost?: number;
  referenceType?: StockReferenceType | string;
  referenceId?: string;
  notes?: string;
  movementType?: StockMovementType;
  consumeReservation?: boolean;
}

export interface StockAdjustmentInput {
  organizationId?: string;
  warehouseId: string;
  zoneId?: string;
  adjustment: number;
  batchNumber?: string;
  serialNumbers?: string[];
  manufacturingDate?: Date;
  expiryDate?: Date;
  unitCost?: number;
  notes: string;
}

export interface StockTransferInput {
  organizationId?: string;
  itemId: string;
  sourceWarehouseId: string;
  sourceZoneId?: string;
  destinationWarehouseId: string;
  destinationZoneId?: string;
  quantity: number;
  notes?: string;
}

export interface ReconciliationLineInput {
  itemId: string;
  zoneId?: string;
  countedQuantity: number;
  batchNumber?: string;
  serialNumbers?: string[];
  manufacturingDate?: Date;
  expiryDate?: Date;
  unitCost?: number;
  notes?: string;
}

type ManualStockChangeInput = Omit<
  StockChangeInput,
  "organizationId" | "performedBy"
> & {
  organizationId?: string;
};

interface ConsumedBatch {
  batchId?: string;
  batchNumber?: string;
  quantity: number;
  serialNumbers: string[];
  manufacturingDate?: Date;
  expiryDate?: Date;
  costPerUnit: number;
}

interface StockOutResult {
  balance: {
    quantity: number;
    availableQuantity: number;
    averageCost: number;
  };
  item: {
    name: string;
    sku: string;
    minStockThreshold: number;
  };
  consumedBatches: ConsumedBatch[];
}

const warehouseScopedRoles = new Set<Role>([
  Role.SUB_ADMIN,
  Role.STORE_MANAGER,
]);

const asBundleComponents = (
  components: ItemInput["bundleComponents"],
): IBundleComponent[] =>
  (components ?? []).map((component) => ({
    itemId: new Types.ObjectId(component.itemId),
    quantity: component.quantity,
  }));

export class InventoryService {
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
      throw new ApiError(403, "Cross-organization access is not allowed");
    }
    return actor.organizationId;
  }

  private assertOrganization(actor: AuthUser) {
    if (!actor.organizationId) {
      throw new ApiError(400, "Organization context is required");
    }
    return actor.organizationId;
  }

  private assertWarehouseScope(actor: AuthUser, warehouseId: string) {
    if (
      [Role.SUPER_ADMIN, Role.ADMIN].includes(actor.role) ||
      !warehouseScopedRoles.has(actor.role) ||
      actor.warehouseIds.includes(warehouseId)
    ) {
      return;
    }
    throw new ApiError(403, "Warehouse is outside your assigned scope");
  }

  private scopedStockFilter<T extends StockListFilter | BatchListFilter>(
    actor: AuthUser,
    filter: T,
  ): T {
    if (filter.warehouseId) {
      this.assertWarehouseScope(actor, filter.warehouseId);
      return filter;
    }
    if (warehouseScopedRoles.has(actor.role)) {
      return { ...filter, warehouseIds: actor.warehouseIds };
    }
    return filter;
  }

  private scopedMovementFilter(
    actor: AuthUser,
    filter: MovementListFilter,
  ): MovementListFilter {
    if (filter.warehouseId) {
      this.assertWarehouseScope(actor, filter.warehouseId);
      return filter;
    }
    if (warehouseScopedRoles.has(actor.role)) {
      return { ...filter, warehouseIds: actor.warehouseIds };
    }
    return filter;
  }

  private async validateLocation(
    organizationId: string,
    warehouseId: string,
    zoneId?: string,
  ) {
    const warehouse = await inventoryRepository.findWarehouse(
      organizationId,
      warehouseId,
    );
    if (!warehouse) throw new ApiError(422, "Warehouse is invalid or inactive");
    if (
      zoneId &&
      !(await inventoryRepository.findZone(
        organizationId,
        warehouseId,
        zoneId,
      ))
    ) {
      throw new ApiError(422, "Warehouse zone is invalid or inactive");
    }
  }

  private async validateCategory(
    organizationId: string,
    categoryId: string,
  ) {
    const category = await inventoryRepository.findCategory(
      organizationId,
      categoryId,
    );
    if (!category?.isActive) {
      throw new ApiError(422, "Category is invalid or inactive");
    }
  }

  private async validatePreferredVendor(
    organizationId: string,
    preferredVendorId?: string,
  ) {
    if (!preferredVendorId) return;
    const vendor = await procurementRepository.findVendor(
      organizationId,
      preferredVendorId,
    );
    if (!vendor?.isActive) {
      throw new ApiError(422, "Preferred vendor is invalid or inactive");
    }
  }

  private async validateBundle(
    organizationId: string,
    isBundled: boolean,
    components: ItemInput["bundleComponents"],
    currentItemId?: string,
  ) {
    const componentIds = (components ?? []).map(
      (component) => component.itemId,
    );
    if (isBundled && componentIds.length === 0) {
      throw new ApiError(422, "Bundled items require bundle components");
    }
    if (!isBundled && componentIds.length > 0) {
      throw new ApiError(422, "Bundle components require isBundled to be true");
    }
    if (
      new Set(componentIds).size !== componentIds.length ||
      (currentItemId && componentIds.includes(currentItemId))
    ) {
      throw new ApiError(422, "Bundle components must be unique and cannot include the item itself");
    }
    const componentsFound = await Promise.all(
      componentIds.map((id) =>
        inventoryRepository.findItemDocument(organizationId, id),
      ),
    );
    if (componentsFound.some((item) => !item?.isActive || item.isBundled)) {
      throw new ApiError(
        422,
        "Bundle components must be active, non-bundled organization items",
      );
    }
  }

  private validateTracking(
    trackBatches: boolean | undefined,
    trackExpiry: boolean | undefined,
  ) {
    if (trackExpiry && !trackBatches) {
      throw new ApiError(422, "Expiry tracking requires batch tracking");
    }
  }

  async createItem(actor: AuthUser, data: ItemInput) {
    const organizationId = this.organizationId(actor, data.organizationId);
    await this.validateCategory(organizationId, data.categoryId);
    await this.validatePreferredVendor(organizationId, data.preferredVendorId);
    this.validateTracking(data.trackBatches, data.trackExpiry);
    await this.validateBundle(
      organizationId,
      data.isBundled ?? false,
      data.bundleComponents,
    );
    const item = await inventoryRepository.createItem(organizationId, {
      ...data,
      organizationId: new Types.ObjectId(organizationId),
      categoryId: new Types.ObjectId(data.categoryId),
      preferredVendorId: data.preferredVendorId
        ? new Types.ObjectId(data.preferredVendorId)
        : undefined,
      bundleComponents: asBundleComponents(data.bundleComponents),
    });
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

  listItems(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    filter: ItemListFilter,
  ) {
    return inventoryRepository.listItemsPage(
      this.organizationId(actor, requestedOrganizationId),
      filter,
    );
  }

  async getItem(
    actor: AuthUser,
    id: string,
    requestedOrganizationId?: string,
  ) {
    const item = await inventoryRepository.findItem(
      this.organizationId(actor, requestedOrganizationId),
      id,
    );
    if (!item) throw new ApiError(404, "Item not found");
    return item;
  }

  async updateItem(
    actor: AuthUser,
    id: string,
    data: Partial<ItemInput>,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    const before = await inventoryRepository.findItemDocument(
      organizationId,
      id,
    );
    if (!before) throw new ApiError(404, "Item not found");
    if (data.categoryId) {
      await this.validateCategory(organizationId, data.categoryId);
    }
    await this.validatePreferredVendor(organizationId, data.preferredVendorId);
    const trackBatches = data.trackBatches ?? before.trackBatches;
    const trackExpiry = data.trackExpiry ?? before.trackExpiry;
    this.validateTracking(trackBatches, trackExpiry);
    const minStockThreshold =
      data.minStockThreshold ?? before.minStockThreshold;
    const maxStockThreshold =
      data.maxStockThreshold ?? before.maxStockThreshold;
    if (
      maxStockThreshold !== undefined &&
      maxStockThreshold < minStockThreshold
    ) {
      throw new ApiError(
        422,
        "maxStockThreshold must be greater than or equal to minStockThreshold",
      );
    }
    if (
      data.trackBatches !== undefined &&
      data.trackBatches !== before.trackBatches &&
      (await inventoryRepository.countItemStock(organizationId, id)) > 0
    ) {
      throw new ApiError(
        409,
        "Batch tracking cannot be changed while the item has stock",
      );
    }
    const isBundled = data.isBundled ?? before.isBundled;
    const bundleComponents =
      data.bundleComponents ??
      before.bundleComponents.map((component) => ({
        itemId: component.itemId.toString(),
        quantity: component.quantity,
      }));
    await this.validateBundle(
      organizationId,
      isBundled,
      bundleComponents,
      id,
    );

    const update: Record<string, unknown> = { ...data };
    if (data.categoryId) {
      update.categoryId = new Types.ObjectId(data.categoryId);
    }
    if (data.preferredVendorId) {
      update.preferredVendorId = new Types.ObjectId(data.preferredVendorId);
    }
    if (data.bundleComponents) {
      update.bundleComponents = asBundleComponents(data.bundleComponents);
    }
    const item = await inventoryRepository.updateItem(
      organizationId,
      id,
      update,
    );
    if (!item) throw new ApiError(404, "Item not found");
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "item.update",
        entityType: "Item",
        entityId: id,
        before: before.toObject(),
        after: item.toObject(),
      },
    );
    return item;
  }

  async deleteItem(
    actor: AuthUser,
    id: string,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    const item = await inventoryRepository.findItemDocument(
      organizationId,
      id,
    );
    if (!item) throw new ApiError(404, "Item not found");
    if (await inventoryRepository.countItemStock(organizationId, id)) {
      throw new ApiError(
        409,
        "Item cannot be deleted while stock or reservations remain",
      );
    }
    await inventoryRepository.softDeleteItem(
      organizationId,
      id,
      actor.id,
    );
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "item.delete",
        entityType: "Item",
        entityId: id,
        before: item.toObject(),
      },
    );
  }

  archiveItem(actor: AuthUser, id: string, requestedOrganizationId?: string) {
    return this.deleteItem(actor, id, requestedOrganizationId);
  }

  async scan(
    actor: AuthUser,
    value: string,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    const item = await inventoryRepository.findItemByScan(
      organizationId,
      value,
    );
    if (!item) throw new ApiError(404, "No item matches this barcode or QR code");
    const stock = await inventoryRepository.listBalances(
      organizationId,
      undefined,
      item.id,
    );
    return { item, stock };
  }

  async createCategory(actor: AuthUser, data: CategoryInput) {
    const organizationId = this.organizationId(actor, data.organizationId);
    if (data.parentCategoryId) {
      await this.validateCategory(organizationId, data.parentCategoryId);
    }
    const category = await inventoryRepository.createCategory(
      organizationId,
      {
        ...data,
        organizationId: new Types.ObjectId(organizationId),
        parentCategoryId: data.parentCategoryId
          ? new Types.ObjectId(data.parentCategoryId)
          : undefined,
      },
    );
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "category.create",
        entityType: "Category",
        entityId: category.id,
        after: category.toObject(),
      },
    );
    return category;
  }

  listCategories(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    filter: CategoryListFilter,
  ) {
    return inventoryRepository.listCategories(
      this.organizationId(actor, requestedOrganizationId),
      filter,
    );
  }

  async updateCategory(
    actor: AuthUser,
    id: string,
    data: Partial<CategoryInput>,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    const before = await inventoryRepository.findCategory(organizationId, id);
    if (!before) throw new ApiError(404, "Category not found");
    if (data.parentCategoryId === id) {
      throw new ApiError(422, "Category cannot be its own parent");
    }
    if (data.parentCategoryId) {
      await this.validateCategory(organizationId, data.parentCategoryId);
      if (
        await inventoryRepository.wouldCreateCategoryCycle(
          organizationId,
          id,
          data.parentCategoryId,
        )
      ) {
        throw new ApiError(422, "Category hierarchy cannot contain a cycle");
      }
    }
    const update: Record<string, unknown> = { ...data };
    if (data.parentCategoryId === null) {
      delete update.parentCategoryId;
      update.$unset = { parentCategoryId: 1 };
    } else if (data.parentCategoryId) {
      update.parentCategoryId = new Types.ObjectId(data.parentCategoryId);
    }
    const category = await inventoryRepository.updateCategory(
      organizationId,
      id,
      update,
    );
    if (!category) throw new ApiError(404, "Category not found");
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "category.update",
        entityType: "Category",
        entityId: id,
        before: before.toObject(),
        after: category.toObject(),
      },
    );
    return category;
  }

  async deleteCategory(
    actor: AuthUser,
    id: string,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    const category = await inventoryRepository.findCategory(
      organizationId,
      id,
    );
    if (!category) throw new ApiError(404, "Category not found");
    const [children, items] = await Promise.all([
      inventoryRepository.countCategoryChildren(organizationId, id),
      inventoryRepository.countCategoryItems(organizationId, id),
    ]);
    if (children || items) {
      throw new ApiError(
        409,
        "Category cannot be deleted while child categories or items use it",
      );
    }
    await inventoryRepository.softDeleteCategory(
      organizationId,
      id,
      actor.id,
    );
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "category.delete",
        entityType: "Category",
        entityId: id,
        before: category.toObject(),
      },
    );
  }

  async itemStock(
    actor: AuthUser,
    itemId: string,
    requestedOrganizationId: string | undefined,
    filter: StockListFilter,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    if (!(await inventoryRepository.findItemDocument(organizationId, itemId))) {
      throw new ApiError(404, "Item not found");
    }
    return inventoryRepository.listItemStockPage(
      organizationId,
      itemId,
      this.scopedStockFilter(actor, filter),
    );
  }

  async itemBatches(
    actor: AuthUser,
    itemId: string,
    requestedOrganizationId: string | undefined,
    filter: BatchListFilter,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    if (!(await inventoryRepository.findItemDocument(organizationId, itemId))) {
      throw new ApiError(404, "Item not found");
    }
    return inventoryRepository.listBatches(
      organizationId,
      itemId,
      this.scopedStockFilter(actor, filter),
    );
  }

  async itemMovements(
    actor: AuthUser,
    itemId: string,
    requestedOrganizationId: string | undefined,
    filter: MovementListFilter,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    if (!(await inventoryRepository.findItemDocument(organizationId, itemId))) {
      throw new ApiError(404, "Item not found");
    }
    return inventoryRepository.listMovementsPage(
      organizationId,
      this.scopedMovementFilter(actor, { ...filter, itemId }),
    );
  }

  lowStock(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    filter: StockListFilter,
  ) {
    return inventoryRepository.listLowStockPage(
      this.organizationId(actor, requestedOrganizationId),
      this.scopedStockFilter(actor, filter),
    );
  }

  deadStock(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    days: number,
    filter: StockListFilter,
  ) {
    return inventoryRepository.listDeadStock(
      this.organizationId(actor, requestedOrganizationId),
      new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      this.scopedStockFilter(actor, filter),
    );
  }

  expiring(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    days: number,
    filter: StockListFilter,
  ) {
    const from = new Date();
    const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
    return inventoryRepository.listExpiringBatches(
      this.organizationId(actor, requestedOrganizationId),
      from,
      to,
      this.scopedStockFilter(actor, filter),
    );
  }

  async listBalances(actor: AuthUser, warehouseId?: string) {
    if (warehouseId) this.assertWarehouseScope(actor, warehouseId);
    if (!warehouseId && warehouseScopedRoles.has(actor.role)) {
      const groups = await Promise.all(
        actor.warehouseIds.map((id) =>
          inventoryRepository.listBalances(
            this.assertOrganization(actor),
            id,
          ),
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
    const result = await this.lowStock(
      actor,
      actor.organizationId,
      warehouseId ? { warehouseId, limit: 100 } : { limit: 100 },
    );
    return result.rows;
  }

  async listMovements(actor: AuthUser, filter: MovementListFilter) {
    return inventoryRepository.listMovements(
      this.assertOrganization(actor),
      this.scopedMovementFilter(actor, filter),
    );
  }

  listMovementsPage(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    filter: MovementListFilter,
  ) {
    return inventoryRepository.listMovementsPage(
      this.organizationId(actor, requestedOrganizationId),
      this.scopedMovementFilter(actor, filter),
    );
  }

  async stockIn(input: StockChangeInput, session?: ClientSession) {
    const execute = async (activeSession?: ClientSession) => {
      const item = await inventoryRepository.findItemDocument(
        input.organizationId,
        input.itemId,
      );
      if (!item?.isActive) throw new ApiError(404, "Item not found");
      await this.validateLocation(
        input.organizationId,
        input.warehouseId,
        input.zoneId,
      );
      if (item.trackBatches && !input.batchNumber) {
        throw new ApiError(422, "Batch number is required for this item");
      }
      if (
        !item.trackBatches &&
        (input.batchNumber ||
          input.serialNumbers?.length ||
          input.manufacturingDate ||
          input.expiryDate)
      ) {
        throw new ApiError(
          422,
          "Batch, serial, and expiry data require batch tracking",
        );
      }
      if (item.trackExpiry && !input.expiryDate) {
        throw new ApiError(422, "Expiry date is required for this item");
      }
      if (
        input.serialNumbers?.length &&
        (!Number.isInteger(input.quantity) ||
          input.serialNumbers.length !== input.quantity ||
          new Set(input.serialNumbers).size !== input.serialNumbers.length)
      ) {
        throw new ApiError(
          422,
          "Serial numbers must be unique and match the integer stock quantity",
        );
      }
      if (
        input.manufacturingDate &&
        input.expiryDate &&
        input.expiryDate <= input.manufacturingDate
      ) {
        throw new ApiError(422, "Expiry date must be after manufacturing date");
      }
      if (
        input.serialNumbers?.length &&
        (await inventoryRepository.findBatchContainingSerials(
          input.organizationId,
          input.serialNumbers,
          activeSession,
        ))
      ) {
        throw new ApiError(409, "One or more serial numbers already exist");
      }
      const costPerUnit = input.unitCost ?? 0;
      const balance = await inventoryRepository.incrementBalance(
        input.organizationId,
        input.itemId,
        input.warehouseId,
        input.quantity,
        activeSession,
        input.zoneId,
        costPerUnit,
      );
      let batchId: string | undefined;
      if (input.batchNumber) {
        const batch = await inventoryRepository.upsertBatch(
          {
            organizationId: input.organizationId,
            itemId: input.itemId,
            warehouseId: input.warehouseId,
            zoneId: input.zoneId,
            batchNumber: input.batchNumber,
            quantity: input.quantity,
            serialNumbers: input.serialNumbers,
            manufacturingDate: input.manufacturingDate,
            expiryDate: input.expiryDate,
            unitCost: costPerUnit,
            purchaseOrderId:
              input.referenceType === StockReferenceType.PURCHASE_ORDER ||
              input.referenceType === "PurchaseOrder"
                ? input.referenceId
                : undefined,
            grnId:
              input.referenceType === StockReferenceType.GRN ||
              input.referenceType === "GoodsReceivedNote"
                ? input.referenceId
                : undefined,
          },
          activeSession,
        );
        batchId = batch.id;
      }
      const movement = await inventoryRepository.createMovement(
        {
          ...input,
          batchId,
          type: input.movementType ?? StockMovementType.INFLOW,
          balanceAfter: balance.quantity,
          costPerUnit,
        },
        activeSession,
      );
      return { balance, item, movement };
    };

    if (session) return execute(session);
    return execute();
  }

  async stockOut(
    input: StockChangeInput,
    session?: ClientSession,
  ): Promise<StockOutResult> {
    const execute = async (activeSession?: ClientSession) => {
      const item = await inventoryRepository.findItemDocument(
        input.organizationId,
        input.itemId,
      );
      if (!item?.isActive) throw new ApiError(404, "Item not found");
      await this.validateLocation(
        input.organizationId,
        input.warehouseId,
        input.zoneId,
      );
      if (
        !item.trackBatches &&
        (input.batchNumber || input.serialNumbers?.length)
      ) {
        throw new ApiError(
          422,
          "Batch and serial selection require batch tracking",
        );
      }
      const current = await inventoryRepository.findBalance(
        input.organizationId,
        input.itemId,
        input.warehouseId,
        activeSession,
        input.zoneId,
      );
      const availableQuantity = current
        ? current.availableQuantity ??
          Math.max(0, current.quantity - current.reservedQuantity)
        : 0;
      const reservedQuantity = current?.reservedQuantity ?? 0;
      if (
        !current ||
        (input.consumeReservation
          ? reservedQuantity < input.quantity
          : availableQuantity < input.quantity)
      ) {
        throw new ApiError(409, `Insufficient stock for SKU ${item.sku}`);
      }

      const consumedBatches: ConsumedBatch[] = [];
      let totalConsumedCost = 0;
      if (item.trackBatches) {
        const availableBatches =
          await inventoryRepository.findAvailableBatches(
          input.organizationId,
          input.itemId,
          input.warehouseId,
          activeSession,
          input.zoneId,
          item.valuationMethod,
        );
        const batches = input.batchNumber
          ? availableBatches.filter(
              (batch) =>
                batch.batchNumber === input.batchNumber?.toUpperCase(),
            )
          : availableBatches;
        const requestedSerials = new Set(input.serialNumbers ?? []);
        if (
          requestedSerials.size &&
          (!Number.isInteger(input.quantity) ||
            requestedSerials.size !== input.quantity)
        ) {
          throw new ApiError(
            422,
            "Serial number count must equal the integer stock quantity",
          );
        }
        let remaining = input.quantity;
        for (const batch of batches) {
          if (remaining <= 0) break;
          const batchRemaining =
            batch.remainingQuantity ?? batch.quantity;
          const matchingSerials = requestedSerials.size
            ? batch.serialNumbers.filter((serial) =>
                requestedSerials.has(serial),
              )
            : [];
          if (requestedSerials.size && matchingSerials.length === 0) continue;
          const quantity = Math.min(
            batchRemaining,
            remaining,
            requestedSerials.size
              ? matchingSerials.length
              : batchRemaining,
          );
          const serialNumbers = requestedSerials.size
            ? matchingSerials.slice(0, quantity)
            : Number.isInteger(quantity)
              ? batch.serialNumbers.slice(0, quantity)
              : [];
          const updated = await inventoryRepository.decrementBatch(
            batch.id,
            quantity,
            activeSession,
            serialNumbers,
          );
          if (!updated) throw new ApiError(409, "Batch stock changed; retry");
          serialNumbers.forEach((serial) => requestedSerials.delete(serial));
          const costPerUnit =
            batch.costPerUnit ?? batch.unitCost ?? current.averageCost ?? 0;
          totalConsumedCost += quantity * costPerUnit;
          consumedBatches.push({
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            quantity,
            serialNumbers,
            manufacturingDate: batch.manufacturingDate,
            expiryDate: batch.expiryDate,
            costPerUnit,
          });
          remaining -= quantity;
        }
        if (remaining > 0 || requestedSerials.size > 0) {
          throw new ApiError(409, "Insufficient matching non-expired batch stock");
        }
      } else {
        const costPerUnit = current.averageCost ?? 0;
        totalConsumedCost = input.quantity * costPerUnit;
        consumedBatches.push({
          quantity: input.quantity,
          serialNumbers: input.serialNumbers ?? [],
          costPerUnit,
        });
      }

      const averageConsumedCost =
        input.quantity > 0 ? totalConsumedCost / input.quantity : 0;
      const balance = input.consumeReservation
        ? await inventoryRepository.consumeReservedBalance(
            input.organizationId,
            input.itemId,
            input.warehouseId,
            input.quantity,
            averageConsumedCost,
            activeSession,
            input.zoneId,
          )
        : await inventoryRepository.decrementBalance(
            input.organizationId,
            input.itemId,
            input.warehouseId,
            input.quantity,
            activeSession,
            input.zoneId,
            averageConsumedCost,
          );
      if (!balance) throw new ApiError(409, "Stock changed; retry the operation");

      let consumed = 0;
      for (const batch of consumedBatches) {
        consumed += batch.quantity;
        await inventoryRepository.createMovement(
          {
            ...input,
            batchId: batch.batchId,
            quantity: batch.quantity,
            serialNumbers: batch.serialNumbers,
            type: input.movementType ?? StockMovementType.OUTFLOW,
            balanceAfter: current.quantity - consumed,
            costPerUnit: batch.costPerUnit,
          },
          activeSession,
        );
      }
      return {
        balance: {
          quantity: balance.quantity,
          availableQuantity:
            balance.availableQuantity ??
            Math.max(0, balance.quantity - balance.reservedQuantity),
          averageCost: balance.averageCost ?? 0,
        },
        item: {
          name: item.name,
          sku: item.sku,
          minStockThreshold: item.minStockThreshold,
        },
        consumedBatches,
      };
    };

    if (session) return execute(session);
    const result = await execute();
    await this.sendLowStockAlert(
      input.organizationId,
      input.warehouseId,
      result.item.name,
      result.item.sku,
      result.balance.availableQuantity,
      result.item.minStockThreshold,
    );
    return result;
  }

  async reserveStock(
    input: {
      organizationId: string;
      itemId: string;
      warehouseId: string;
      quantity: number;
      zoneId?: string;
    },
    session?: ClientSession,
  ) {
    const item = await inventoryRepository.findItemDocument(
      input.organizationId,
      input.itemId,
    );
    if (!item?.isActive) throw new ApiError(404, "Item not found");
    await this.validateLocation(
      input.organizationId,
      input.warehouseId,
      input.zoneId,
    );
    if (item.trackBatches) {
      const batches = await inventoryRepository.findAvailableBatches(
        input.organizationId,
        input.itemId,
        input.warehouseId,
        session,
        input.zoneId,
        item.valuationMethod,
      );
      const batchQuantity = batches.reduce(
        (total, batch) =>
          total + (batch.remainingQuantity ?? batch.quantity),
        0,
      );
      if (batchQuantity < input.quantity) {
        throw new ApiError(
          409,
          `Insufficient non-expired batch stock for SKU ${item.sku}`,
        );
      }
    }
    const balance = await inventoryRepository.reserveBalance(
      input.organizationId,
      input.itemId,
      input.warehouseId,
      input.quantity,
      session,
      input.zoneId,
    );
    if (!balance) {
      throw new ApiError(409, `Insufficient stock for SKU ${item.sku}`);
    }
    return {
      balance,
      item: {
        name: item.name,
        sku: item.sku,
        averageCost: balance.averageCost ?? 0,
      },
    };
  }

  async releaseReservedStock(
    input: {
      organizationId: string;
      itemId: string;
      warehouseId: string;
      quantity: number;
      zoneId?: string;
    },
    session?: ClientSession,
  ) {
    const balance = await inventoryRepository.releaseReservedBalance(
      input.organizationId,
      input.itemId,
      input.warehouseId,
      input.quantity,
      session,
      input.zoneId,
    );
    if (!balance) {
      throw new ApiError(409, "Stock reservation changed; retry the operation");
    }
    return balance;
  }

  async manualStockIn(
    actor: AuthUser,
    data: ManualStockChangeInput,
  ) {
    this.assertWarehouseScope(actor, data.warehouseId);
    const organizationId = this.organizationId(actor, data.organizationId);
    return this.stockIn({
      ...data,
      organizationId,
      performedBy: actor.id,
    });
  }

  async manualStockOut(
    actor: AuthUser,
    data: ManualStockChangeInput,
  ) {
    this.assertWarehouseScope(actor, data.warehouseId);
    const organizationId = this.organizationId(actor, data.organizationId);
    return this.stockOut({
      ...data,
      organizationId,
      performedBy: actor.id,
    });
  }

  async adjustStock(
    actor: AuthUser,
    itemId: string,
    data: StockAdjustmentInput,
  ) {
    const organizationId = this.organizationId(
      actor,
      data.organizationId,
    );
    this.assertWarehouseScope(actor, data.warehouseId);
    const referenceId = new Types.ObjectId().toString();
    const common = {
      organizationId,
      itemId,
      warehouseId: data.warehouseId,
      zoneId: data.zoneId,
      quantity: Math.abs(data.adjustment),
      performedBy: actor.id,
      batchNumber: data.batchNumber,
      serialNumbers: data.serialNumbers,
      manufacturingDate: data.manufacturingDate,
      expiryDate: data.expiryDate,
      unitCost: data.unitCost,
      referenceType: StockReferenceType.MANUAL,
      referenceId,
      notes: data.notes,
      movementType: StockMovementType.ADJUSTMENT,
    };
    const result =
      data.adjustment > 0
        ? await this.stockIn(common)
        : await this.stockOut(common);
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "stock.adjust",
        entityType: "Item",
        entityId: itemId,
        metadata: {
          warehouseId: data.warehouseId,
          zoneId: data.zoneId,
          adjustment: data.adjustment,
          referenceId,
        },
      },
    );
    return result;
  }

  async transferStock(actor: AuthUser, data: StockTransferInput) {
    const organizationId = this.organizationId(
      actor,
      data.organizationId,
    );
    this.assertWarehouseScope(actor, data.sourceWarehouseId);
    this.assertWarehouseScope(actor, data.destinationWarehouseId);
    if (
      data.sourceWarehouseId === data.destinationWarehouseId &&
      data.sourceZoneId === data.destinationZoneId
    ) {
      throw new ApiError(422, "Source and destination locations must differ");
    }
    const referenceId = new Types.ObjectId().toString();
    const session = await mongoose.startSession();
    let output: {
      referenceId: string;
      source: StockOutResult;
    } | undefined;
    try {
      await session.withTransaction(async () => {
        const source = await this.stockOut(
          {
            organizationId,
            itemId: data.itemId,
            warehouseId: data.sourceWarehouseId,
            zoneId: data.sourceZoneId,
            quantity: data.quantity,
            performedBy: actor.id,
            referenceType: StockReferenceType.TRANSFER,
            referenceId,
            notes: data.notes,
            movementType: StockMovementType.TRANSFER_OUT,
          },
          session,
        );
        for (const consumed of source.consumedBatches) {
          await this.stockIn(
            {
              organizationId,
              itemId: data.itemId,
              warehouseId: data.destinationWarehouseId,
              zoneId: data.destinationZoneId,
              quantity: consumed.quantity,
              performedBy: actor.id,
              batchNumber: consumed.batchNumber,
              serialNumbers: consumed.serialNumbers,
              manufacturingDate: consumed.manufacturingDate,
              expiryDate: consumed.expiryDate,
              unitCost: consumed.costPerUnit,
              referenceType: StockReferenceType.TRANSFER,
              referenceId,
              notes: data.notes,
              movementType: StockMovementType.TRANSFER_IN,
            },
            session,
          );
        }
        output = { referenceId, source };
      });
    } finally {
      await session.endSession();
    }
    if (!output) throw new ApiError(500, "Stock transfer did not complete");
    await this.sendLowStockAlert(
      organizationId,
      data.sourceWarehouseId,
      output.source.item.name,
      output.source.item.sku,
      output.source.balance.availableQuantity,
      output.source.item.minStockThreshold,
    );
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "stock.transfer",
        entityType: "Item",
        entityId: data.itemId,
        metadata: {
          ...data,
          referenceId,
        },
      },
    );
    return {
      referenceId,
      transferredQuantity: data.quantity,
      sourceBalance: output.source.balance,
    };
  }

  async reconcileStock(
    actor: AuthUser,
    warehouseId: string,
    lines: ReconciliationLineInput[],
    notes?: string,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    this.assertWarehouseScope(actor, warehouseId);
    const referenceId = new Types.ObjectId().toString();
    const session = await mongoose.startSession();
    const results: Array<{
      itemId: string;
      previousQuantity: number;
      countedQuantity: number;
      adjustment: number;
    }> = [];
    try {
      await session.withTransaction(async () => {
        for (const line of lines) {
          const balance = await inventoryRepository.findBalance(
            organizationId,
            line.itemId,
            warehouseId,
            session,
            line.zoneId,
          );
          const previousQuantity = balance?.quantity ?? 0;
          const adjustment = line.countedQuantity - previousQuantity;
          if (adjustment > 0) {
            await this.stockIn(
              {
                organizationId,
                itemId: line.itemId,
                warehouseId,
                zoneId: line.zoneId,
                quantity: adjustment,
                performedBy: actor.id,
                batchNumber: line.batchNumber,
                serialNumbers: line.serialNumbers,
                manufacturingDate: line.manufacturingDate,
                expiryDate: line.expiryDate,
                unitCost: line.unitCost,
                referenceType: StockReferenceType.MANUAL,
                referenceId,
                notes: line.notes ?? notes,
                movementType: StockMovementType.ADJUSTMENT,
              },
              session,
            );
          } else if (adjustment < 0) {
            await this.stockOut(
              {
                organizationId,
                itemId: line.itemId,
                warehouseId,
                zoneId: line.zoneId,
                quantity: Math.abs(adjustment),
                performedBy: actor.id,
                serialNumbers: line.serialNumbers,
                referenceType: StockReferenceType.MANUAL,
                referenceId,
                notes: line.notes ?? notes,
                movementType: StockMovementType.ADJUSTMENT,
              },
              session,
            );
          }
          results.push({
            itemId: line.itemId,
            previousQuantity,
            countedQuantity: line.countedQuantity,
            adjustment,
          });
        }
      });
    } finally {
      await session.endSession();
    }
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "stock.reconcile",
        entityType: "Warehouse",
        entityId: warehouseId,
        metadata: { referenceId, lines: results, notes },
      },
    );
    await this.alertLowStockForWarehouse(organizationId, warehouseId);
    return { referenceId, warehouseId, lines: results };
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
        message: `${itemName} (${sku}) has ${quantity} available.`,
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
        row.item.name,
        row.item.sku,
        row.availableQuantity,
        row.effectiveThreshold,
      );
    }
  }
}

export const inventoryService = new InventoryService();
