import { Request, Response } from "express";
import { NotificationListFilter } from "../repository/notification.repository";
import { notificationService } from "../services/notification.service";
import { sendSuccess } from "../utils/api-response";
import {
  actorFrom,
  validatedBody,
  validatedParams,
  validatedQuery,
} from "./controller.utils";

export const notificationController = {
  async list(req: Request, res: Response) {
    const result = await notificationService.listForUser(
      actorFrom(req).id,
      validatedQuery<NotificationListFilter>(req),
    );
    return sendSuccess(
      res,
      "Notifications fetched successfully",
      result.notifications,
      200,
      result.pagination,
    );
  },

  async markRead(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    return sendSuccess(
      res,
      "Notification marked as read",
      await notificationService.markRead(actorFrom(req).id, id),
    );
  },

  async markAllRead(req: Request, res: Response) {
    return sendSuccess(
      res,
      "Notifications marked as read",
      await notificationService.markAllRead(actorFrom(req).id),
    );
  },

  async remove(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    await notificationService.remove(actorFrom(req).id, id);
    return sendSuccess(res, "Notification deleted successfully", null);
  },

  async preferences(req: Request, res: Response) {
    return sendSuccess(
      res,
      "Notification preferences fetched successfully",
      await notificationService.preferences(actorFrom(req).id),
    );
  },

  async updatePreferences(req: Request, res: Response) {
    const actor = actorFrom(req);
    return sendSuccess(
      res,
      "Notification preferences updated successfully",
      await notificationService.updatePreferences(
        actor.organizationId,
        actor.id,
        validatedBody(req),
      ),
    );
  },
};
