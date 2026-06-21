import { FilterQuery, Types, UpdateQuery } from "mongoose";
import { ApiKeyStatus, Permission, SortOrder } from "../constants";
import {
  ApiKeyModel,
  ApiKeyUsageLogModel,
  IApiKey,
} from "./schemas";

export interface ApiKeyCreateRecord {
  organizationId: string;
  name: string;
  description?: string;
  prefix: string;
  keyHash: string;
  keyLast4: string;
  scopes: Permission[];
  allowedIps?: string[];
  expiresAt?: Date;
  createdBy: string;
}

export interface ApiKeyListFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: ApiKeyStatus;
  sortBy?: string;
  sortOrder?: SortOrder | "asc" | "desc";
}

export interface ApiKeyUsageFilter {
  page?: number;
  limit?: number;
}

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const pageValues = (filter: { page?: number; limit?: number }) => ({
  page: filter.page ?? 1,
  limit: filter.limit ?? 20,
});

const sort = (
  filter: ApiKeyListFilter,
  fallback: string,
): Record<string, 1 | -1> => ({
  [filter.sortBy ?? fallback]: filter.sortOrder === SortOrder.ASC ? 1 : -1,
});

const pagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

export class ApiKeyRepository {
  create(data: ApiKeyCreateRecord) {
    return ApiKeyModel.create(data);
  }

  async list(organizationId: string, filter: ApiKeyListFilter = {}) {
    const { page, limit } = pageValues(filter);
    const query: FilterQuery<IApiKey> = {
      organizationId,
      isDeleted: { $ne: true },
    };
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      const search = escapeRegex(filter.search);
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { prefix: { $regex: search, $options: "i" } },
      ];
    }
    const [apiKeys, total] = await Promise.all([
      ApiKeyModel.find(query)
        .sort(sort(filter, "createdAt"))
        .skip((page - 1) * limit)
        .limit(limit),
      ApiKeyModel.countDocuments(query),
    ]);
    return { apiKeys, pagination: pagination(page, limit, total) };
  }

  findById(organizationId: string, id: string) {
    return ApiKeyModel.findOne({
      _id: id,
      organizationId,
      isDeleted: { $ne: true },
    });
  }

  findByPrefixWithHash(prefix: string) {
    return ApiKeyModel.findOne({
      prefix,
      isDeleted: { $ne: true },
    }).select("+keyHash");
  }

  update(
    organizationId: string,
    id: string,
    data: UpdateQuery<IApiKey>,
  ) {
    return ApiKeyModel.findOneAndUpdate(
      { _id: id, organizationId, isDeleted: { $ne: true } },
      data,
      { new: true, runValidators: true },
    );
  }

  softDelete(organizationId: string, id: string, actorId: string) {
    return this.update(organizationId, id, {
      isDeleted: true,
      status: ApiKeyStatus.REVOKED,
      deletedAt: new Date(),
      deletedBy: new Types.ObjectId(actorId),
      revokedAt: new Date(),
      revokedBy: new Types.ObjectId(actorId),
    });
  }

  markUsed(id: string, ipAddress?: string) {
    return ApiKeyModel.findByIdAndUpdate(id, {
      lastUsedAt: new Date(),
      lastUsedIp: ipAddress,
      $inc: { usageCount: 1 },
    });
  }

  createUsageLog(data: {
    organizationId: string;
    apiKeyId: string;
    method: string;
    path: string;
    ipAddress?: string;
    statusCode?: number;
    userAgent?: string;
  }) {
    return ApiKeyUsageLogModel.create(data);
  }

  async usageLogs(
    organizationId: string,
    apiKeyId: string,
    filter: ApiKeyUsageFilter = {},
  ) {
    const { page, limit } = pageValues(filter);
    const query = { organizationId, apiKeyId };
    const [logs, total] = await Promise.all([
      ApiKeyUsageLogModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ApiKeyUsageLogModel.countDocuments(query),
    ]);
    return { logs, pagination: pagination(page, limit, total) };
  }
}

export const apiKeyRepository = new ApiKeyRepository();
