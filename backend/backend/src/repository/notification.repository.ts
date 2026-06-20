import { FilterQuery, Types } from "mongoose";
import {
  NotificationChannel,
  NotificationType,
  SortOrder,
} from "../constants";
import {
  INotification,
  INotificationPreferenceEntry,
  NotificationModel,
  NotificationPreferenceModel,
} from "./schemas";

export interface NotificationCreateRecord {
  organizationId?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
  channels?: NotificationChannel[];
  data?: Record<string, unknown>;
}

export interface NotificationListFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder | "asc" | "desc";
  unreadOnly?: boolean;
  type?: NotificationType;
  search?: string;
}

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const pageValues = (filter: NotificationListFilter) => ({
  page: filter.page ?? 1,
  limit: filter.limit ?? 25,
});

const sort = (
  filter: NotificationListFilter,
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

export class NotificationRepository {
  create(data: NotificationCreateRecord) {
    return NotificationModel.create(data);
  }

  async listForUser(userId: string, filter: NotificationListFilter = {}) {
    const { page, limit } = pageValues(filter);
    const query: FilterQuery<INotification> = {
      userId,
      isDeleted: { $ne: true },
    };
    if (filter.unreadOnly) query.isRead = false;
    if (filter.type) query.type = filter.type;
    if (filter.search) {
      const search = escapeRegex(filter.search);
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }
    const [notifications, total] = await Promise.all([
      NotificationModel.find(query)
        .sort(sort(filter, "createdAt"))
        .skip((page - 1) * limit)
        .limit(limit),
      NotificationModel.countDocuments(query),
    ]);
    return { notifications, pagination: pagination(page, limit, total) };
  }

  markRead(userId: string, id: string) {
    return NotificationModel.findOneAndUpdate(
      { _id: id, userId, isDeleted: { $ne: true } },
      { isRead: true, readAt: new Date() },
      { new: true, runValidators: true },
    );
  }

  markAllRead(userId: string) {
    return NotificationModel.updateMany(
      { userId, isRead: false, isDeleted: { $ne: true } },
      { isRead: true, readAt: new Date() },
    );
  }

  softDelete(userId: string, id: string) {
    return NotificationModel.findOneAndUpdate(
      { _id: id, userId, isDeleted: { $ne: true } },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: new Types.ObjectId(userId),
      },
      { new: true, runValidators: true },
    );
  }

  markEmailSent(id: string) {
    return NotificationModel.findByIdAndUpdate(id, {
      emailSentAt: new Date(),
    });
  }

  markWhatsappSent(id: string) {
    return NotificationModel.findByIdAndUpdate(id, {
      whatsappSentAt: new Date(),
    });
  }

  preferenceForUser(userId: string) {
    return NotificationPreferenceModel.findOne({
      userId,
      isDeleted: { $ne: true },
    });
  }

  upsertPreferences(
    organizationId: string | undefined,
    userId: string,
    preferences: INotificationPreferenceEntry[],
  ) {
    return NotificationPreferenceModel.findOneAndUpdate(
      { userId, isDeleted: { $ne: true } },
      {
        $set: {
          organizationId,
          userId,
          preferences,
        },
        $setOnInsert: { isDeleted: false },
      },
      { new: true, upsert: true, runValidators: true },
    );
  }
}

export const notificationRepository = new NotificationRepository();
