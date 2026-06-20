import {
  NotificationChannel,
  NotificationType,
} from "../constants/status";
import { whatsappQueue } from "../queue/alert.queue";
import { notificationQueue } from "../queue/notification.queue";
import {
  NotificationListFilter,
  notificationRepository,
} from "../repository/notification.repository";
import { INotificationPreferenceEntry, UserModel } from "../repository/schemas";
import { ApiError } from "../utils/api-error";

export interface NotificationPreferenceInput {
  preferences: INotificationPreferenceEntry[];
}

export interface NotifyUserInput {
  organizationId?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  template: string;
  variables: Record<string, string | number>;
  referenceType?: string;
  referenceId?: string;
  data?: Record<string, unknown>;
}

const defaultChannels = [
  NotificationChannel.IN_APP,
  NotificationChannel.EMAIL,
] as const;

const channelsForType = (
  preferences: INotificationPreferenceEntry[] | undefined,
  type: NotificationType,
) =>
  preferences?.find((entry) => entry.type === type)?.channels ??
  [...defaultChannels];

export class NotificationService {
  async notifyUser(data: NotifyUserInput) {
    const [user, preference] = await Promise.all([
      UserModel.findById(data.userId).select("email phone isActive isDeleted"),
      notificationRepository.preferenceForUser(data.userId),
    ]);
    if (!user?.isActive || user.isDeleted) {
      throw new ApiError(404, "Notification user not found");
    }
    const channels = channelsForType(preference?.preferences, data.type);
    const notification = await notificationRepository.create({
      organizationId: data.organizationId,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      channels,
      data: data.data,
    });
    if (channels.includes(NotificationChannel.EMAIL) && user.email) {
      await notificationQueue.add({
        notificationId: notification.id,
        to: user.email,
        subject: data.title,
        template: data.template,
        variables: data.variables,
      });
    }
    if (channels.includes(NotificationChannel.WHATSAPP) && user.phone) {
      await whatsappQueue.add({
        notificationId: notification.id,
        to: user.phone,
        message: data.message,
      });
    }
    return notification;
  }

  async notifyMany(
    userIds: string[],
    data: Omit<NotifyUserInput, "userId">,
  ) {
    return Promise.all(
      [...new Set(userIds)].map((userId) =>
        this.notifyUser({ ...data, userId }),
      ),
    );
  }

  listForUser(userId: string, filter: NotificationListFilter = {}) {
    return notificationRepository.listForUser(userId, filter);
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await notificationRepository.markRead(
      userId,
      notificationId,
    );
    if (!notification) throw new ApiError(404, "Notification not found");
    return notification;
  }

  async markAllRead(userId: string) {
    const result = await notificationRepository.markAllRead(userId);
    return { modifiedCount: result.modifiedCount };
  }

  async remove(userId: string, notificationId: string) {
    const notification = await notificationRepository.softDelete(
      userId,
      notificationId,
    );
    if (!notification) throw new ApiError(404, "Notification not found");
  }

  async preferences(userId: string) {
    const preference = await notificationRepository.preferenceForUser(userId);
    return {
      preferences: preference?.preferences ?? [],
      defaults: Object.values(NotificationType).map((type) => ({
        type,
        channels: [...defaultChannels],
      })),
    };
  }

  updatePreferences(
    organizationId: string | undefined,
    userId: string,
    input: NotificationPreferenceInput,
  ) {
    return notificationRepository.upsertPreferences(
      organizationId,
      userId,
      input.preferences,
    );
  }
}

export const notificationService = new NotificationService();
