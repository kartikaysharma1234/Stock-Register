import {
  ClientSession,
  FilterQuery,
  Types,
  UpdateQuery,
} from "mongoose";
import { StockMovementType, WarehouseType } from "../constants";
import {
  IWarehouse,
  IWarehouseZone,
  InventoryBalanceModel,
  ItemModel,
  StockMovementModel,
  UserModel,
  WarehouseModel,
  WarehouseZoneModel,
} from "./schemas";

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface WarehouseListOptions extends PaginationOptions {
  search?: string;
  type?: WarehouseType;
  isActive?: boolean;
  city?: string;
  managerId?: string;
  warehouseIds?: string[];
}

export interface WarehouseZoneListOptions extends PaginationOptions {
  search?: string;
  isActive?: boolean;
}

export interface WarehouseStockListOptions extends PaginationOptions {
  search?: string;
  itemId?: string;
}

export interface WarehouseMovementListOptions extends PaginationOptions {
  itemId?: string;
  type?: StockMovementType;
  from?: Date;
  to?: Date;
}

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const pagination = (options: PaginationOptions) => ({
  page: options.page ?? 1,
  limit: options.limit ?? 20,
});

const sort = (
  options: PaginationOptions,
  fallback: string,
): Record<string, 1 | -1> => ({
  [options.sortBy ?? fallback]: options.sortOrder === "asc" ? 1 : -1,
});

export class WarehouseRepository {
  create(
    organizationId: string,
    data: {
      name: string;
      code: string;
      type: WarehouseType;
      address?: IWarehouse["address"];
      managerId?: string;
      contactPhone?: string;
      isActive?: boolean;
    },
    session?: ClientSession,
  ) {
    const payload = {
      ...data,
      organizationId,
      managerUserIds: data.managerId ? [data.managerId] : [],
    };
    if (session) {
      return WarehouseModel.create([payload], { session }).then(
        ([warehouse]) => warehouse,
      );
    }
    return WarehouseModel.create(payload);
  }

  async list(organizationId: string, options: WarehouseListOptions = {}) {
    const { page, limit } = pagination(options);
    const filter: FilterQuery<IWarehouse> = {
      organizationId,
      isDeleted: { $ne: true },
    };

    if (options.warehouseIds) {
      filter._id = { $in: options.warehouseIds };
    }
    if (options.search) {
      const pattern = escapeRegex(options.search);
      filter.$or = [
        { name: { $regex: pattern, $options: "i" } },
        { code: { $regex: pattern, $options: "i" } },
        { location: { $regex: pattern, $options: "i" } },
        { "address.city": { $regex: pattern, $options: "i" } },
      ];
    }
    if (options.type) filter.type = options.type;
    if (options.isActive !== undefined) filter.isActive = options.isActive;
    if (options.city) {
      filter["address.city"] = {
        $regex: escapeRegex(options.city),
        $options: "i",
      };
    }
    if (options.managerId) {
      filter.$and = [
        ...(filter.$and ?? []),
        {
          $or: [
            { managerId: options.managerId },
            { managerUserIds: options.managerId },
          ],
        },
      ];
    }

    const [warehouses, total] = await Promise.all([
      WarehouseModel.find(filter)
        .populate("managerId", "name email role isActive")
        .sort(sort(options, "createdAt"))
        .skip((page - 1) * limit)
        .limit(limit),
      WarehouseModel.countDocuments(filter),
    ]);

    return {
      warehouses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  findById(organizationId: string, id: string) {
    return WarehouseModel.findOne({
      _id: id,
      organizationId,
      isDeleted: { $ne: true },
    }).populate("managerId", "name email role isActive");
  }

  findDocumentById(organizationId: string, id: string) {
    return WarehouseModel.findOne({
      _id: id,
      organizationId,
      isDeleted: { $ne: true },
    });
  }

  update(
    organizationId: string,
    id: string,
    data: UpdateQuery<IWarehouse>,
    session?: ClientSession,
  ) {
    return WarehouseModel.findOneAndUpdate(
      {
        _id: id,
        organizationId,
        isDeleted: { $ne: true },
      },
      data,
      {
        new: true,
        runValidators: true,
        session,
      },
    ).populate("managerId", "name email role isActive");
  }

  softDelete(
    organizationId: string,
    id: string,
    actorId: string,
    session?: ClientSession,
  ) {
    return this.update(
      organizationId,
      id,
      {
        isDeleted: true,
        isActive: false,
        deletedAt: new Date(),
        deletedBy: new Types.ObjectId(actorId),
      },
      session,
    );
  }

  hasStock(organizationId: string, warehouseId: string) {
    return InventoryBalanceModel.exists({
      organizationId,
      warehouseId,
      $or: [
        { quantity: { $gt: 0 } },
        { reservedQuantity: { $gt: 0 } },
      ],
    });
  }

  async listZones(
    organizationId: string,
    warehouseId: string,
    options: WarehouseZoneListOptions = {},
  ) {
    const { page, limit } = pagination(options);
    const filter: FilterQuery<IWarehouseZone> = {
      organizationId,
      warehouseId,
      isDeleted: false,
    };
    if (options.search) {
      const pattern = escapeRegex(options.search);
      filter.$or = [
        { name: { $regex: pattern, $options: "i" } },
        { code: { $regex: pattern, $options: "i" } },
      ];
    }
    if (options.isActive !== undefined) filter.isActive = options.isActive;

    const [zones, total] = await Promise.all([
      WarehouseZoneModel.find(filter)
        .sort(sort(options, "createdAt"))
        .skip((page - 1) * limit)
        .limit(limit),
      WarehouseZoneModel.countDocuments(filter),
    ]);
    return {
      zones,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  createZone(
    organizationId: string,
    warehouseId: string,
    data: {
      name: string;
      code: string;
      description?: string;
      isActive?: boolean;
    },
  ) {
    return WarehouseZoneModel.create({
      ...data,
      organizationId,
      warehouseId,
    });
  }

  findZone(
    organizationId: string,
    warehouseId: string,
    zoneId: string,
  ) {
    return WarehouseZoneModel.findOne({
      _id: zoneId,
      organizationId,
      warehouseId,
      isDeleted: false,
    });
  }

  updateZone(
    organizationId: string,
    warehouseId: string,
    zoneId: string,
    data: UpdateQuery<IWarehouseZone>,
  ) {
    return WarehouseZoneModel.findOneAndUpdate(
      {
        _id: zoneId,
        organizationId,
        warehouseId,
        isDeleted: false,
      },
      data,
      { new: true, runValidators: true },
    );
  }

  softDeleteZones(
    organizationId: string,
    warehouseId: string,
    actorId: string,
    session?: ClientSession,
  ) {
    return WarehouseZoneModel.updateMany(
      {
        organizationId,
        warehouseId,
        isDeleted: false,
      },
      {
        isDeleted: true,
        isActive: false,
        deletedAt: new Date(),
        deletedBy: new Types.ObjectId(actorId),
      },
      { session },
    );
  }

  assignManager(
    organizationId: string,
    warehouseId: string,
    managerId: string,
    session?: ClientSession,
  ) {
    return UserModel.updateOne(
      {
        _id: managerId,
        organizationId,
        isDeleted: false,
      },
      { $addToSet: { warehouseIds: warehouseId } },
      { session },
    );
  }

  unassignManager(
    organizationId: string,
    warehouseId: string,
    managerId: string,
    session?: ClientSession,
  ) {
    return UserModel.updateOne(
      {
        _id: managerId,
        organizationId,
        isDeleted: false,
      },
      { $pull: { warehouseIds: warehouseId } },
      { session },
    );
  }

  async unassignWarehouse(
    organizationId: string,
    warehouseId: string,
    session?: ClientSession,
  ) {
    return Promise.all([
      UserModel.updateMany(
        {
          organizationId,
          isDeleted: false,
          warehouseIds: warehouseId,
        },
        { $pull: { warehouseIds: warehouseId } },
        { session },
      ),
      UserModel.updateMany(
        {
          organizationId,
          isDeleted: false,
          warehouseId,
        },
        { $unset: { warehouseId: 1 } },
        { session },
      ),
    ]);
  }

  async listStock(
    organizationId: string,
    warehouseId: string,
    options: WarehouseStockListOptions = {},
  ) {
    const { page, limit } = pagination(options);
    const filter: Record<string, unknown> = {
      organizationId,
      warehouseId,
    };
    if (options.search) {
      const pattern = escapeRegex(options.search);
      const itemIds = await ItemModel.find({
        organizationId,
        ...(options.itemId ? { _id: options.itemId } : {}),
        $or: [
          { name: { $regex: pattern, $options: "i" } },
          { sku: { $regex: pattern, $options: "i" } },
          { barcode: { $regex: pattern, $options: "i" } },
        ],
      }).distinct("_id");
      filter.itemId = { $in: itemIds };
    } else if (options.itemId) {
      filter.itemId = options.itemId;
    }

    const [stock, total] = await Promise.all([
      InventoryBalanceModel.find(filter)
        .populate(
          "itemId",
          "name sku unit barcode minStockThreshold isActive",
        )
        .sort(sort(options, "updatedAt"))
        .skip((page - 1) * limit)
        .limit(limit),
      InventoryBalanceModel.countDocuments(filter),
    ]);

    return {
      stock,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listMovements(
    organizationId: string,
    warehouseId: string,
    options: WarehouseMovementListOptions = {},
  ) {
    const { page, limit } = pagination(options);
    const filter: Record<string, unknown> = {
      organizationId,
      warehouseId,
    };
    if (options.itemId) filter.itemId = options.itemId;
    if (options.type) filter.type = options.type;
    if (options.from || options.to) {
      filter.occurredAt = {
        ...(options.from ? { $gte: options.from } : {}),
        ...(options.to ? { $lte: options.to } : {}),
      };
    }

    const [movements, total] = await Promise.all([
      StockMovementModel.find(filter)
        .populate("itemId", "name sku unit barcode")
        .populate("departmentId", "name code")
        .populate("batchId", "batchNumber expiryDate")
        .populate("performedBy", "name email role")
        .sort(sort(options, "occurredAt"))
        .skip((page - 1) * limit)
        .limit(limit),
      StockMovementModel.countDocuments(filter),
    ]);

    return {
      movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const warehouseRepository = new WarehouseRepository();
