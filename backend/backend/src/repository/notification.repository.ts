import { NotificationType } from "../constants/status";
import { NotificationModel } from "./schemas";

export class NotificationRepository {
  create(data: {
    organizationId?: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }) {
    return NotificationModel.create(data);
  }

  listForUser(userId: string, unreadOnly = false) {
    return NotificationModel.find({
      userId,
      ...(unreadOnly ? { readAt: { $exists: false } } : {}),
    }).sort({ createdAt: -1 });
  }

  markRead(userId: string, id: string) {
    return NotificationModel.findOneAndUpdate(
      { _id: id, userId },
      { readAt: new Date() },
      { new: true },
    );
  }

  markEmailSent(id: string) {
    return NotificationModel.findByIdAndUpdate(id, { emailSentAt: new Date() });
  }
}

export const notificationRepository = new NotificationRepository();
