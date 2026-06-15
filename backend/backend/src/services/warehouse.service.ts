import mongoose, { HydratedDocument } from "mongoose";
import { Role, WarehouseType } from "../constants";
import {
  warehouseRepository,
  WarehouseListOptions,
  WarehouseMovementListOptions,
  WarehouseStockListOptions,
  WarehouseZoneListOptions,
} from "../repository/warehouse.repository";
import {
  IWarehouse,
  IWarehouseAddress,
} from "../repository/schemas";
import { userRepository } from "../repository/user.repository";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { auditService } from "./audit.service";

export interface WarehouseCreateInput {
  organizationId?: string;
  name: string;
  code: string;
  type: WarehouseType;
  address?: IWarehouseAddress;
  managerId?: string;
  contactPhone?: string;
  isActive?: boolean;
}

export interface WarehouseUpdateInput {
  name?: string;
  code?: string;
  type?: WarehouseType;
  address?: IWarehouseAddress | null;
  managerId?: string | null;
  contactPhone?: string | null;
  isActive?: boolean;
}

export interface WarehouseZoneInput {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
}

const scopedWarehouseRoles = new Set<Role>([
  Role.SUB_ADMIN,
  Role.STORE_MANAGER,
]);

export const canReadWarehouse = (actor: AuthUser, warehouseId: string) =>
  !scopedWarehouseRoles.has(actor.role) ||
  actor.warehouseIds.includes(warehouseId);

export const canManageWarehouse = (actor: AuthUser, warehouseId: string) =>
  [Role.SUPER_ADMIN, Role.ADMIN].includes(actor.role) ||
  actor.warehouseIds.includes(warehouseId);

export class WarehouseService {
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

  private assertReadAccess(actor: AuthUser, warehouseId: string) {
    if (!canReadWarehouse(actor, warehouseId)) {
      throw new ApiError(403, "Warehouse is outside your assigned scope");
    }
  }

  private assertManageAccess(actor: AuthUser, warehouseId: string) {
    if (!canManageWarehouse(actor, warehouseId)) {
      throw new ApiError(403, "You cannot manage this warehouse");
    }
  }

  private async validateManager(
    organizationId: string,
    managerId?: string | null,
  ) {
    if (!managerId) return;
    const manager = await userRepository.findById(managerId, organizationId);
    if (!manager?.isActive) {
      throw new ApiError(422, "Warehouse manager must be an active organization user");
    }
    if (
      ![Role.ADMIN, Role.SUB_ADMIN, Role.STORE_MANAGER].includes(manager.role)
    ) {
      throw new ApiError(
        422,
        "Warehouse manager must be an Admin, Sub Admin, or Store Manager",
      );
    }
  }

  async list(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    options: WarehouseListOptions,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    return warehouseRepository.list(organizationId, {
      ...options,
      ...(scopedWarehouseRoles.has(actor.role)
        ? { warehouseIds: actor.warehouseIds }
        : {}),
    });
  }

  async get(
    actor: AuthUser,
    id: string,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    this.assertReadAccess(actor, id);
    const warehouse = await warehouseRepository.findById(organizationId, id);
    if (!warehouse) throw new ApiError(404, "Warehouse not found");
    return warehouse;
  }

  async create(actor: AuthUser, data: WarehouseCreateInput) {
    const organizationId = this.organizationId(actor, data.organizationId);
    await this.validateManager(organizationId, data.managerId);

    const session = await mongoose.startSession();
    let warehouse: HydratedDocument<IWarehouse> | undefined;
    try {
      await session.withTransaction(async () => {
        warehouse = await warehouseRepository.create(
          organizationId,
          {
            name: data.name,
            code: data.code,
            type: data.type,
            address: data.address,
            managerId: data.managerId,
            contactPhone: data.contactPhone,
            isActive: data.isActive,
          },
          session,
        );
        if (data.managerId) {
          await warehouseRepository.assignManager(
            organizationId,
            warehouse.id,
            data.managerId,
            session,
          );
        }
      });
    } finally {
      await session.endSession();
    }
    if (!warehouse) {
      throw new ApiError(500, "Warehouse creation did not complete");
    }
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "warehouse.create",
        entityType: "Warehouse",
        entityId: warehouse.id,
        after: warehouse.toObject(),
      },
    );
    return warehouse;
  }

  async update(
    actor: AuthUser,
    id: string,
    data: WarehouseUpdateInput,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    this.assertManageAccess(actor, id);
    const before = await warehouseRepository.findDocumentById(
      organizationId,
      id,
    );
    if (!before) throw new ApiError(404, "Warehouse not found");
    await this.validateManager(organizationId, data.managerId);

    const previousManagerId = before.managerId?.toString();
    const nextManagerId =
      data.managerId === undefined ? previousManagerId : data.managerId ?? undefined;
    const update: Record<string, unknown> = { ...data };
    const unset: Record<string, number> = {};
    if (data.managerId === null) {
      delete update.managerId;
      unset.managerId = 1;
      update.managerUserIds = [];
    } else if (data.managerId) {
      update.managerUserIds = [data.managerId];
    }
    if (data.address === null) {
      delete update.address;
      unset.address = 1;
    }
    if (data.contactPhone === null) {
      delete update.contactPhone;
      unset.contactPhone = 1;
    }
    if (Object.keys(unset).length) update.$unset = unset;

    const session = await mongoose.startSession();
    let warehouse: HydratedDocument<IWarehouse> | null | undefined;
    try {
      await session.withTransaction(async () => {
        warehouse = await warehouseRepository.update(
          organizationId,
          id,
          update,
          session,
        );
        if (
          previousManagerId &&
          previousManagerId !== nextManagerId
        ) {
          await warehouseRepository.unassignManager(
            organizationId,
            id,
            previousManagerId,
            session,
          );
        }
        if (nextManagerId && previousManagerId !== nextManagerId) {
          await warehouseRepository.assignManager(
            organizationId,
            id,
            nextManagerId,
            session,
          );
        }
      });
    } finally {
      await session.endSession();
    }
    if (!warehouse) throw new ApiError(404, "Warehouse not found");
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "warehouse.update",
        entityType: "Warehouse",
        entityId: id,
        before: before.toObject(),
        after: warehouse.toObject(),
      },
    );
    return warehouse;
  }

  async remove(
    actor: AuthUser,
    id: string,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    this.assertManageAccess(actor, id);
    const warehouse = await warehouseRepository.findDocumentById(
      organizationId,
      id,
    );
    if (!warehouse) throw new ApiError(404, "Warehouse not found");
    if (await warehouseRepository.hasStock(organizationId, id)) {
      throw new ApiError(
        409,
        "Warehouse cannot be deleted while stock or reservations remain",
      );
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await warehouseRepository.softDelete(
          organizationId,
          id,
          actor.id,
          session,
        );
        await warehouseRepository.softDeleteZones(
          organizationId,
          id,
          actor.id,
          session,
        );
        await warehouseRepository.unassignWarehouse(
          organizationId,
          id,
          session,
        );
      });
    } finally {
      await session.endSession();
    }
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "warehouse.delete",
        entityType: "Warehouse",
        entityId: id,
        before: warehouse.toObject(),
      },
    );
  }

  async listZones(
    actor: AuthUser,
    warehouseId: string,
    requestedOrganizationId: string | undefined,
    options: WarehouseZoneListOptions,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    await this.requireWarehouse(actor, organizationId, warehouseId, false);
    return warehouseRepository.listZones(
      organizationId,
      warehouseId,
      options,
    );
  }

  async createZone(
    actor: AuthUser,
    warehouseId: string,
    data: WarehouseZoneInput,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    await this.requireWarehouse(actor, organizationId, warehouseId, true);
    const zone = await warehouseRepository.createZone(
      organizationId,
      warehouseId,
      data,
    );
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "warehouse_zone.create",
        entityType: "WarehouseZone",
        entityId: zone.id,
        after: zone.toObject(),
      },
    );
    return zone;
  }

  async updateZone(
    actor: AuthUser,
    warehouseId: string,
    zoneId: string,
    data: Partial<WarehouseZoneInput>,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    await this.requireWarehouse(actor, organizationId, warehouseId, true);
    const before = await warehouseRepository.findZone(
      organizationId,
      warehouseId,
      zoneId,
    );
    if (!before) throw new ApiError(404, "Warehouse zone not found");
    const zone = await warehouseRepository.updateZone(
      organizationId,
      warehouseId,
      zoneId,
      data,
    );
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "warehouse_zone.update",
        entityType: "WarehouseZone",
        entityId: zoneId,
        before: before.toObject(),
        after: zone?.toObject(),
      },
    );
    return zone;
  }

  async stock(
    actor: AuthUser,
    warehouseId: string,
    requestedOrganizationId: string | undefined,
    options: WarehouseStockListOptions,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    await this.requireWarehouse(actor, organizationId, warehouseId, false);
    const result = await warehouseRepository.listStock(
      organizationId,
      warehouseId,
      options,
    );
    return {
      stock: result.stock.map((row) => ({
        ...row.toObject(),
        availableQuantity: Math.max(
          0,
          row.quantity - row.reservedQuantity,
        ),
      })),
      pagination: result.pagination,
    };
  }

  async movements(
    actor: AuthUser,
    warehouseId: string,
    requestedOrganizationId: string | undefined,
    options: WarehouseMovementListOptions,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    await this.requireWarehouse(actor, organizationId, warehouseId, false);
    return warehouseRepository.listMovements(
      organizationId,
      warehouseId,
      options,
    );
  }

  private async requireWarehouse(
    actor: AuthUser,
    organizationId: string,
    warehouseId: string,
    manage: boolean,
  ) {
    if (manage) {
      this.assertManageAccess(actor, warehouseId);
    } else {
      this.assertReadAccess(actor, warehouseId);
    }
    if (
      !(await warehouseRepository.findDocumentById(
        organizationId,
        warehouseId,
      ))
    ) {
      throw new ApiError(404, "Warehouse not found");
    }
  }
}

export const warehouseService = new WarehouseService();
