import mongoose, { HydratedDocument } from "mongoose";
import {
  AssetAction,
  AssetStatus,
  CounterType,
  DepreciationMethod,
  Role,
} from "../constants";
import { AssetListFilter, assetRepository } from "../repository/asset.repository";
import { counterRepository } from "../repository/counter.repository";
import { IAsset, IAssetMaintenanceSchedule } from "../repository/schemas";
import { userRepository } from "../repository/user.repository";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { auditService } from "./audit.service";

export interface AssetInput {
  organizationId?: string;
  itemId: string;
  name: string;
  serialNumber?: string;
  barcode?: string;
  category?: string;
  warehouseId: string;
  zoneId?: string;
  purchaseDate?: Date;
  purchaseCost?: number;
  currentValue?: number;
  depreciationMethod?: DepreciationMethod;
  depreciationRate?: number;
  usefulLifeYears?: number;
  warrantyExpiry?: Date;
  insuranceExpiry?: Date;
  maintenanceSchedule?: IAssetMaintenanceSchedule[];
  notes?: string;
  attachments?: string[];
}

export type AssetUpdateInput = Partial<AssetInput>;

export interface AssignAssetInput {
  assignedTo: string;
  expectedReturnDate?: Date;
  notes?: string;
}

export interface ReturnAssetInput {
  notes?: string;
}

export interface MaintenanceInput {
  maintenanceType?: string;
  intervalDays?: number;
  completed?: boolean;
  nextDue?: Date;
  cost?: number;
  notes?: string;
}

export interface DisposeInput {
  notes?: string;
}

type AssetDocument = HydratedDocument<IAsset>;

const scopedWarehouseRoles = new Set<Role>([
  Role.SUB_ADMIN,
  Role.STORE_MANAGER,
  Role.VIEWER,
]);

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
};

export class AssetService {
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

  private scopedFilter(actor: AuthUser, filter: AssetListFilter) {
    if (this.isAdmin(actor) || !scopedWarehouseRoles.has(actor.role)) {
      return filter;
    }
    const warehouseIds = this.actorWarehouseIds(actor);
    return warehouseIds.length ? { ...filter, warehouseIds } : filter;
  }

  private assertWarehouseScope(actor: AuthUser, warehouseId: string) {
    if (this.isAdmin(actor)) return;
    const warehouseIds = this.actorWarehouseIds(actor);
    if (!warehouseIds.length || warehouseIds.includes(warehouseId)) return;
    throw new ApiError(403, "Warehouse is outside your assigned scope");
  }

  private assertAssetAccess(actor: AuthUser, asset: AssetDocument) {
    if (!scopedWarehouseRoles.has(actor.role)) return;
    this.assertWarehouseScope(actor, asset.warehouseId.toString());
  }

  private currentValue(input: {
    purchaseCost?: number;
    currentValue?: number;
    purchaseDate?: Date;
    depreciationMethod?: DepreciationMethod;
    depreciationRate?: number;
    usefulLifeYears?: number;
  }) {
    if (input.currentValue !== undefined) return roundMoney(input.currentValue);
    const cost = input.purchaseCost ?? 0;
    if (cost <= 0) return 0;
    const purchaseDate = input.purchaseDate;
    if (!purchaseDate) return roundMoney(cost);
    const elapsedYears = Math.max(
      0,
      (Date.now() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );
    const annualRate =
      input.depreciationRate && input.depreciationRate > 0
        ? input.depreciationRate / 100
        : input.usefulLifeYears && input.usefulLifeYears > 0
          ? 1 / input.usefulLifeYears
          : 0;
    if (annualRate <= 0) return roundMoney(cost);
    if (input.depreciationMethod === DepreciationMethod.DECLINING_BALANCE) {
      return roundMoney(Math.max(0, cost * (1 - annualRate) ** elapsedYears));
    }
    return roundMoney(Math.max(0, cost * (1 - annualRate * elapsedYears)));
  }

  private normalizeSchedule(schedule?: IAssetMaintenanceSchedule[]) {
    return (schedule ?? []).map((entry) => ({
      ...entry,
      nextDue:
        entry.nextDue ??
        (entry.lastDone ? addDays(entry.lastDone, entry.intervalDays) : undefined),
    }));
  }

  private async validateItem(organizationId: string, itemId: string) {
    const item = await assetRepository.findItem(organizationId, itemId);
    if (!item?.isActive) throw new ApiError(404, "Item not found");
    if (!item.isAsset) {
      throw new ApiError(422, "Item must be marked as an asset item");
    }
  }

  private async validateLocation(
    organizationId: string,
    warehouseId: string,
    zoneId?: string,
  ) {
    const warehouse = await assetRepository.findWarehouse(
      organizationId,
      warehouseId,
    );
    if (!warehouse) throw new ApiError(404, "Warehouse not found");
    if (zoneId) {
      const zone = await assetRepository.findZone(
        organizationId,
        warehouseId,
        zoneId,
      );
      if (!zone) throw new ApiError(404, "Warehouse zone not found");
    }
  }

  private async validateUser(organizationId: string, userId: string) {
    const user = await userRepository.findById(userId, organizationId);
    if (!user?.isActive) throw new ApiError(404, "Assigned user not found");
  }

  async create(actor: AuthUser, data: AssetInput) {
    const organizationId = this.organizationId(actor, data.organizationId);
    this.assertWarehouseScope(actor, data.warehouseId);
    await Promise.all([
      this.validateItem(organizationId, data.itemId),
      this.validateLocation(organizationId, data.warehouseId, data.zoneId),
    ]);
    const assetTag = await counterRepository.nextNumber(
      organizationId,
      CounterType.ASSET,
    );
    const asset = await assetRepository.create({
      organizationId,
      assetTag,
      itemId: data.itemId,
      name: data.name,
      serialNumber: data.serialNumber,
      barcode: data.barcode,
      category: data.category,
      warehouseId: data.warehouseId,
      zoneId: data.zoneId,
      status: AssetStatus.AVAILABLE,
      purchaseDate: data.purchaseDate,
      purchaseCost: data.purchaseCost ?? 0,
      currentValue: this.currentValue(data),
      depreciationMethod:
        data.depreciationMethod ?? DepreciationMethod.STRAIGHT_LINE,
      depreciationRate: data.depreciationRate ?? 0,
      usefulLifeYears: data.usefulLifeYears ?? 0,
      warrantyExpiry: data.warrantyExpiry,
      insuranceExpiry: data.insuranceExpiry,
      maintenanceSchedule: this.normalizeSchedule(data.maintenanceSchedule),
      notes: data.notes,
      attachments: data.attachments,
    });
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "asset.create",
        entityType: "Asset",
        entityId: asset.id,
        after: asset.toObject(),
      },
    );
    return asset;
  }

  list(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    filter: AssetListFilter,
  ) {
    return assetRepository.list(
      this.organizationId(actor, requestedOrganizationId),
      this.scopedFilter(actor, filter),
    );
  }

  async get(
    actor: AuthUser,
    id: string,
    requestedOrganizationId?: string,
  ) {
    const asset = await assetRepository.findById(
      this.organizationId(actor, requestedOrganizationId),
      id,
    );
    if (!asset) throw new ApiError(404, "Asset not found");
    this.assertAssetAccess(actor, asset);
    return asset;
  }

  async update(
    actor: AuthUser,
    id: string,
    data: AssetUpdateInput,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId ?? data.organizationId,
    );
    const before = await assetRepository.findDocument(organizationId, id);
    if (!before) throw new ApiError(404, "Asset not found");
    this.assertAssetAccess(actor, before);
    const warehouseId = data.warehouseId ?? before.warehouseId.toString();
    this.assertWarehouseScope(actor, warehouseId);
    if (data.itemId) await this.validateItem(organizationId, data.itemId);
    if (data.warehouseId || data.zoneId !== undefined) {
      await this.validateLocation(organizationId, warehouseId, data.zoneId);
    }
    const mergedValueInput = {
      purchaseCost: data.purchaseCost ?? before.purchaseCost,
      currentValue: data.currentValue,
      purchaseDate: data.purchaseDate ?? before.purchaseDate,
      depreciationMethod:
        data.depreciationMethod ?? before.depreciationMethod,
      depreciationRate: data.depreciationRate ?? before.depreciationRate,
      usefulLifeYears: data.usefulLifeYears ?? before.usefulLifeYears,
    };
    const update: Record<string, unknown> = {
      ...data,
      currentValue: this.currentValue(mergedValueInput),
    };
    delete update.organizationId;
    if (data.maintenanceSchedule) {
      update.maintenanceSchedule = this.normalizeSchedule(
        data.maintenanceSchedule,
      );
    }
    const asset = await assetRepository.update(organizationId, id, update);
    if (!asset) throw new ApiError(404, "Asset not found");
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "asset.update",
        entityType: "Asset",
        entityId: id,
        before: before.toObject(),
        after: asset.toObject(),
      },
    );
    return asset;
  }

  async assign(
    actor: AuthUser,
    id: string,
    data: AssignAssetInput,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    await this.validateUser(organizationId, data.assignedTo);
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const asset = await assetRepository.findDocument(
          organizationId,
          id,
          session,
        );
        if (!asset) throw new ApiError(404, "Asset not found");
        this.assertAssetAccess(actor, asset);
        if (asset.status !== AssetStatus.AVAILABLE) {
          throw new ApiError(409, "Only available assets can be assigned");
        }
        await assetRepository.update(
          organizationId,
          id,
          {
            status: AssetStatus.ASSIGNED,
            assignedTo: data.assignedTo,
            assignedAt: new Date(),
            expectedReturnDate: data.expectedReturnDate,
          },
          session,
        );
        await assetRepository.createLog(
          {
            organizationId,
            assetId: id,
            action: AssetAction.ASSIGNED,
            performedBy: actor.id,
            assignedTo: data.assignedTo,
            notes: data.notes,
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }
    const assignedAsset = await assetRepository.findById(organizationId, id);
    if (!assignedAsset) throw new ApiError(500, "Asset assignment failed");
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "asset.assign",
        entityType: "Asset",
        entityId: id,
        metadata: { assignedTo: data.assignedTo },
        after: assignedAsset.toObject(),
      },
    );
    return assignedAsset;
  }

  async returnAsset(
    actor: AuthUser,
    id: string,
    data: ReturnAssetInput,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const asset = await assetRepository.findDocument(
          organizationId,
          id,
          session,
        );
        if (!asset) throw new ApiError(404, "Asset not found");
        this.assertAssetAccess(actor, asset);
        if (asset.status !== AssetStatus.ASSIGNED) {
          throw new ApiError(409, "Only assigned assets can be returned");
        }
        const assignedTo = asset.assignedTo?.toString();
        await assetRepository.update(
          organizationId,
          id,
          {
            status: AssetStatus.AVAILABLE,
            $unset: {
              assignedTo: 1,
              assignedAt: 1,
              expectedReturnDate: 1,
            },
          },
          session,
        );
        await assetRepository.createLog(
          {
            organizationId,
            assetId: id,
            action: AssetAction.RETURNED,
            performedBy: actor.id,
            assignedTo,
            notes: data.notes,
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }
    const returnedAsset = await assetRepository.findById(organizationId, id);
    if (!returnedAsset) throw new ApiError(500, "Asset return failed");
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "asset.return",
        entityType: "Asset",
        entityId: id,
        after: returnedAsset.toObject(),
      },
    );
    return returnedAsset;
  }

  async maintenance(
    actor: AuthUser,
    id: string,
    data: MaintenanceInput,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const asset = await assetRepository.findDocument(
          organizationId,
          id,
          session,
        );
        if (!asset) throw new ApiError(404, "Asset not found");
        this.assertAssetAccess(actor, asset);
        if (asset.status === AssetStatus.DISPOSED) {
          throw new ApiError(409, "Disposed assets cannot be maintained");
        }
        const completed = data.completed ?? true;
        const now = new Date();
        const schedule = asset.maintenanceSchedule.map((entry) => {
          if (
            !completed ||
            !data.maintenanceType ||
            entry.type.toLowerCase() !== data.maintenanceType.toLowerCase()
          ) {
            return entry;
          }
          return {
            ...entry,
            lastDone: now,
            nextDue: data.nextDue ?? addDays(now, entry.intervalDays),
          };
        });
        if (
          completed &&
          data.maintenanceType &&
          !schedule.some(
            (entry) =>
              entry.type.toLowerCase() === data.maintenanceType?.toLowerCase(),
          ) &&
          data.intervalDays
        ) {
          schedule.push({
            type: data.maintenanceType,
            intervalDays: data.intervalDays,
            lastDone: now,
            nextDue: data.nextDue ?? addDays(now, data.intervalDays),
          });
        }
        await assetRepository.update(
          organizationId,
          id,
          {
            status: completed
              ? AssetStatus.AVAILABLE
              : AssetStatus.UNDER_MAINTENANCE,
            maintenanceSchedule: schedule,
          },
          session,
        );
        await assetRepository.createLog(
          {
            organizationId,
            assetId: id,
            action: completed
              ? AssetAction.MAINTENANCE_DONE
              : AssetAction.MAINTENANCE_STARTED,
            performedBy: actor.id,
            notes: data.notes,
            cost: data.cost,
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }
    const maintainedAsset = await assetRepository.findById(organizationId, id);
    if (!maintainedAsset) {
      throw new ApiError(500, "Asset maintenance update failed");
    }
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "asset.maintenance",
        entityType: "Asset",
        entityId: id,
        metadata: {
          completed: data.completed ?? true,
          cost: data.cost,
          maintenanceType: data.maintenanceType,
        },
        after: maintainedAsset.toObject(),
      },
    );
    return maintainedAsset;
  }

  async dispose(
    actor: AuthUser,
    id: string,
    data: DisposeInput,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const asset = await assetRepository.findDocument(
          organizationId,
          id,
          session,
        );
        if (!asset) throw new ApiError(404, "Asset not found");
        this.assertAssetAccess(actor, asset);
        if (asset.status === AssetStatus.DISPOSED) {
          throw new ApiError(409, "Asset is already disposed");
        }
        await assetRepository.update(
          organizationId,
          id,
          {
            status: AssetStatus.DISPOSED,
            $unset: {
              assignedTo: 1,
              assignedAt: 1,
              expectedReturnDate: 1,
            },
          },
          session,
        );
        await assetRepository.createLog(
          {
            organizationId,
            assetId: id,
            action: AssetAction.DISPOSED,
            performedBy: actor.id,
            notes: data.notes,
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }
    const disposedAsset = await assetRepository.findById(organizationId, id);
    if (!disposedAsset) throw new ApiError(500, "Asset disposal failed");
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "asset.dispose",
        entityType: "Asset",
        entityId: id,
        after: disposedAsset.toObject(),
      },
    );
    return disposedAsset;
  }

  dueMaintenance(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    filter: AssetListFilter,
  ) {
    return assetRepository.list(
      this.organizationId(actor, requestedOrganizationId),
      this.scopedFilter(actor, {
        ...filter,
        dueBefore: filter.dueBefore ?? new Date(),
      }),
    );
  }

  async assignedToUser(
    actor: AuthUser,
    userId: string,
    requestedOrganizationId: string | undefined,
    filter: AssetListFilter,
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    await this.validateUser(organizationId, userId);
    return assetRepository.list(
      organizationId,
      this.scopedFilter(actor, { ...filter, assignedTo: userId }),
    );
  }

  async history(
    actor: AuthUser,
    id: string,
    requestedOrganizationId: string | undefined,
    filter: AssetListFilter,
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    const asset = await assetRepository.findDocument(organizationId, id);
    if (!asset) throw new ApiError(404, "Asset not found");
    this.assertAssetAccess(actor, asset);
    return assetRepository.history(organizationId, id, filter);
  }
}

export const assetService = new AssetService();
