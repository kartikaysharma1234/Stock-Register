import {
  ClientSession,
  FilterQuery,
  Types,
  UpdateQuery,
} from "mongoose";
import { AssetAction, AssetStatus, DepreciationMethod } from "../constants";
import {
  AssetLogModel,
  AssetModel,
  IAsset,
  IAssetLog,
  IAssetMaintenanceSchedule,
  ItemModel,
  WarehouseModel,
  WarehouseZoneModel,
} from "./schemas";

export interface AssetPaginationFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface AssetListFilter extends AssetPaginationFilter {
  search?: string;
  status?: AssetStatus;
  warehouseId?: string;
  warehouseIds?: string[];
  assignedTo?: string;
  category?: string;
  dueBefore?: Date;
}

export interface AssetCreateRecord {
  organizationId: string;
  assetTag: string;
  itemId: string;
  name: string;
  serialNumber?: string;
  barcode?: string;
  category?: string;
  warehouseId: string;
  zoneId?: string;
  status?: AssetStatus;
  assignedTo?: string;
  assignedAt?: Date;
  expectedReturnDate?: Date;
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

export interface AssetLogRecord {
  organizationId: string;
  assetId: string;
  action: AssetAction;
  performedBy: string;
  assignedTo?: string;
  notes?: string;
  cost?: number;
}

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const pageValues = (filter: AssetPaginationFilter) => ({
  page: filter.page ?? 1,
  limit: filter.limit ?? 20,
});

const sort = (
  filter: AssetPaginationFilter,
  fallback: string,
): Record<string, 1 | -1> => ({
  [filter.sortBy ?? fallback]: filter.sortOrder === "asc" ? 1 : -1,
});

const pagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

const baseAssetQuery = (organizationId: string): FilterQuery<IAsset> => ({
  organizationId,
  isDeleted: { $ne: true },
});

export class AssetRepository {
  create(data: AssetCreateRecord, session?: ClientSession) {
    if (session) {
      return AssetModel.create([data], { session }).then(([asset]) => asset);
    }
    return AssetModel.create(data);
  }

  findById(
    organizationId: string,
    id: string,
    session?: ClientSession,
  ) {
    return AssetModel.findOne({
      _id: id,
      ...baseAssetQuery(organizationId),
    })
      .populate("itemId", "name sku isAsset")
      .populate("warehouseId", "name code")
      .populate("zoneId", "name code")
      .populate("assignedTo", "name email role")
      .session(session ?? null);
  }

  findDocument(
    organizationId: string,
    id: string,
    session?: ClientSession,
  ) {
    return AssetModel.findOne({
      _id: id,
      ...baseAssetQuery(organizationId),
    }).session(session ?? null);
  }

  async list(organizationId: string, filter: AssetListFilter = {}) {
    const { page, limit } = pageValues(filter);
    const query: FilterQuery<IAsset> = baseAssetQuery(organizationId);
    if (filter.status) query.status = filter.status;
    if (filter.warehouseId) query.warehouseId = filter.warehouseId;
    if (filter.warehouseIds) query.warehouseId = { $in: filter.warehouseIds };
    if (filter.assignedTo) query.assignedTo = filter.assignedTo;
    if (filter.category) query.category = filter.category;
    if (filter.dueBefore) {
      query["maintenanceSchedule.nextDue"] = { $lte: filter.dueBefore };
      query.status = { $ne: AssetStatus.DISPOSED };
    }
    if (filter.search) {
      const search = escapeRegex(filter.search);
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { assetTag: { $regex: search, $options: "i" } },
        { serialNumber: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }
    const [assets, total] = await Promise.all([
      AssetModel.find(query)
        .populate("itemId", "name sku isAsset")
        .populate("warehouseId", "name code")
        .populate("zoneId", "name code")
        .populate("assignedTo", "name email role")
        .sort(sort(filter, "createdAt"))
        .skip((page - 1) * limit)
        .limit(limit),
      AssetModel.countDocuments(query),
    ]);
    return { assets, pagination: pagination(page, limit, total) };
  }

  update(
    organizationId: string,
    id: string,
    data: UpdateQuery<IAsset>,
    session?: ClientSession,
  ) {
    return AssetModel.findOneAndUpdate(
      { _id: id, ...baseAssetQuery(organizationId) },
      data,
      { new: true, runValidators: true, session },
    )
      .populate("itemId", "name sku isAsset")
      .populate("warehouseId", "name code")
      .populate("zoneId", "name code")
      .populate("assignedTo", "name email role");
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
        deletedAt: new Date(),
        deletedBy: new Types.ObjectId(actorId),
      },
      session,
    );
  }

  createLog(data: AssetLogRecord, session?: ClientSession) {
    if (session) {
      return AssetLogModel.create([data], { session }).then(([log]) => log);
    }
    return AssetLogModel.create(data);
  }

  async history(
    organizationId: string,
    assetId: string,
    filter: AssetPaginationFilter = {},
  ) {
    const { page, limit } = pageValues(filter);
    const query: FilterQuery<IAssetLog> = {
      organizationId,
      assetId,
      isDeleted: { $ne: true },
    };
    const [logs, total] = await Promise.all([
      AssetLogModel.find(query)
        .populate("performedBy", "name email role")
        .populate("assignedTo", "name email role")
        .sort(sort(filter, "createdAt"))
        .skip((page - 1) * limit)
        .limit(limit),
      AssetLogModel.countDocuments(query),
    ]);
    return { logs, pagination: pagination(page, limit, total) };
  }

  findItem(organizationId: string, id: string) {
    return ItemModel.findOne({
      _id: id,
      organizationId,
      isDeleted: { $ne: true },
    });
  }

  findWarehouse(organizationId: string, id: string) {
    return WarehouseModel.findOne({
      _id: id,
      organizationId,
      isActive: true,
      isDeleted: { $ne: true },
    });
  }

  findZone(organizationId: string, warehouseId: string, zoneId: string) {
    return WarehouseZoneModel.findOne({
      _id: zoneId,
      organizationId,
      warehouseId,
      isActive: true,
      isDeleted: { $ne: true },
    });
  }
}

export const assetRepository = new AssetRepository();
