import { FilterQuery, Types, UpdateQuery } from "mongoose";
import {
  SortOrder,
  WebhookDeliveryStatus,
  WebhookEvent,
} from "../constants";
import {
  IWebhookEndpoint,
  WebhookDeliveryModel,
  WebhookEndpointModel,
} from "./schemas";

export interface WebhookCreateRecord {
  organizationId: string;
  name: string;
  url: string;
  description?: string;
  events: WebhookEvent[];
  secretEncrypted: string;
  secretLast4: string;
  headers?: Record<string, string>;
  isActive?: boolean;
  createdBy: string;
}

export interface WebhookListFilter {
  page?: number;
  limit?: number;
  search?: string;
  event?: WebhookEvent;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: SortOrder | "asc" | "desc";
}

export interface WebhookDeliveryListFilter {
  page?: number;
  limit?: number;
  status?: WebhookDeliveryStatus;
  event?: WebhookEvent;
}

const pageValues = (filter: { page?: number; limit?: number }) => ({
  page: filter.page ?? 1,
  limit: filter.limit ?? 20,
});

const sort = (
  filter: WebhookListFilter,
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

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class WebhookRepository {
  create(data: WebhookCreateRecord) {
    return WebhookEndpointModel.create(data);
  }

  async list(organizationId: string, filter: WebhookListFilter = {}) {
    const { page, limit } = pageValues(filter);
    const query: FilterQuery<IWebhookEndpoint> = {
      organizationId,
      isDeleted: { $ne: true },
    };
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    if (filter.event) query.events = filter.event;
    if (filter.search) {
      const search = escapeRegex(filter.search);
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { url: { $regex: search, $options: "i" } },
      ];
    }
    const [webhooks, total] = await Promise.all([
      WebhookEndpointModel.find(query)
        .sort(sort(filter, "createdAt"))
        .skip((page - 1) * limit)
        .limit(limit),
      WebhookEndpointModel.countDocuments(query),
    ]);
    return { webhooks, pagination: pagination(page, limit, total) };
  }

  findById(organizationId: string, id: string) {
    return WebhookEndpointModel.findOne({
      _id: id,
      organizationId,
      isDeleted: { $ne: true },
    });
  }

  findByIdWithSecret(id: string) {
    return WebhookEndpointModel.findOne({
      _id: id,
      isDeleted: { $ne: true },
    }).select("+secretEncrypted");
  }

  update(
    organizationId: string,
    id: string,
    data: UpdateQuery<IWebhookEndpoint>,
  ) {
    return WebhookEndpointModel.findOneAndUpdate(
      { _id: id, organizationId, isDeleted: { $ne: true } },
      data,
      { new: true, runValidators: true },
    );
  }

  softDelete(organizationId: string, id: string, actorId: string) {
    return this.update(organizationId, id, {
      isActive: false,
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: new Types.ObjectId(actorId),
    });
  }

  activeForEvent(organizationId: string, event: WebhookEvent) {
    return WebhookEndpointModel.find({
      organizationId,
      events: event,
      isActive: true,
      isDeleted: { $ne: true },
    });
  }

  createDelivery(data: {
    organizationId: string;
    webhookId: string;
    event: WebhookEvent;
    payload: Record<string, unknown>;
    requestHeaders?: Record<string, string>;
    maxAttempts?: number;
  }) {
    return WebhookDeliveryModel.create(data);
  }

  findDelivery(id: string) {
    return WebhookDeliveryModel.findById(id);
  }

  updateDelivery(
    id: string,
    data: UpdateQuery<{
      status: WebhookDeliveryStatus;
      attempt: number;
      nextAttemptAt?: Date;
      deliveredAt?: Date;
      failedAt?: Date;
      requestHeaders: Record<string, string>;
      responseStatus?: number;
      responseBody?: string;
      errorMessage?: string;
      durationMs?: number;
    }>,
  ) {
    return WebhookDeliveryModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  markEndpointTriggered(id: string) {
    return WebhookEndpointModel.findByIdAndUpdate(id, [
      {
        $set: {
          lastTriggeredAt: new Date(),
          failureCount: {
            $max: [{ $subtract: [{ $ifNull: ["$failureCount", 0] }, 1] }, 0],
          },
        },
      },
    ]);
  }

  markEndpointFailed(id: string) {
    return WebhookEndpointModel.findByIdAndUpdate(id, {
      $inc: { failureCount: 1 },
    });
  }

  async deliveries(
    organizationId: string,
    webhookId: string,
    filter: WebhookDeliveryListFilter = {},
  ) {
    const { page, limit } = pageValues(filter);
    const query = {
      organizationId,
      webhookId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.event ? { event: filter.event } : {}),
    };
    const [deliveries, total] = await Promise.all([
      WebhookDeliveryModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      WebhookDeliveryModel.countDocuments(query),
    ]);
    return { deliveries, pagination: pagination(page, limit, total) };
  }
}

export const webhookRepository = new WebhookRepository();
