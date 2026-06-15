import { Router } from "express";
import { z } from "zod";
import { Permission } from "../constants/permissions";
import { notificationController } from "../controllers/notification.controller";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import { objectId } from "../validations/common.validation";

export const notificationRouter = Router();

notificationRouter.get(
  "/",
  requirePermissions(Permission.NOTIFICATION_READ),
  validate(
    z.object({
      query: z.object({
        unreadOnly: z
          .enum(["true", "false"])
          .transform((entry) => entry === "true")
          .optional(),
      }),
    }),
  ),
  notificationController.list,
);
notificationRouter.patch(
  "/:id/read",
  requirePermissions(Permission.NOTIFICATION_READ),
  validate(z.object({ params: z.object({ id: objectId }) })),
  notificationController.markRead,
);
