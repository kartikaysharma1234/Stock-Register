import { Request, Response } from "express";
import { notificationService } from "../services/notification.service";
import {
  actorFrom,
  validatedParams,
  validatedQuery,
} from "./controller.utils";

export const notificationController = {
  async list(req: Request, res: Response) {
    const { unreadOnly } = validatedQuery<{ unreadOnly?: boolean }>(req);
    res.json(
      await notificationService.listForUser(
        actorFrom(req).id,
        unreadOnly ?? false,
      ),
    );
  },
  async markRead(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    res.json(await notificationService.markRead(actorFrom(req).id, id));
  },
};
