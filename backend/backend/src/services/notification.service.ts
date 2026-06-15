import { NotificationType } from "../constants/status";
import { notificationQueue } from "../queue/notification.queue";
import { notificationRepository } from "../repository/notification.repository";
import { UserModel } from "../repository/schemas";

export class NotificationService {
  async notifyUser(data: {
    organizationId?: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    template: string;
    variables: Record<string, string | number>;
  }) {
    const [notification, user] = await Promise.all([
      notificationRepository.create(data),
      UserModel.findById(data.userId).select("email"),
    ]);
    if (user?.email) {
      await notificationQueue.add({
        notificationId: notification.id,
        to: user.email,
        subject: data.title,
        template: data.template,
        variables: data.variables,
      });
    }
    return notification;
  }

  async notifyMany(
    userIds: string[],
    data: Omit<Parameters<NotificationService["notifyUser"]>[0], "userId">,
  ) {
    return Promise.all(
      [...new Set(userIds)].map((userId) => this.notifyUser({ ...data, userId })),
    );
  }

  listForUser(userId: string, unreadOnly = false) {
    return notificationRepository.listForUser(userId, unreadOnly);
  }

  markRead(userId: string, notificationId: string) {
    return notificationRepository.markRead(userId, notificationId);
  }
}

export const notificationService = new NotificationService();
