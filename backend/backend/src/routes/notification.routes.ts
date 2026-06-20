import { Router } from "express";
import { Permission } from "../constants/permissions";
import { notificationController } from "../controllers/notification.controller";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  notificationIdValidation,
  notificationListValidation,
  notificationPreferenceValidation,
} from "../validations/notification.validation";

export const notificationRouter = Router();

notificationRouter.get(
  "/",
  requirePermissions(Permission.NOTIFICATION_READ),
  validate(notificationListValidation),
  notificationController.list,
);

notificationRouter.put(
  "/read-all",
  requirePermissions(Permission.NOTIFICATION_UPDATE),
  notificationController.markAllRead,
);

notificationRouter.get(
  "/preferences",
  requirePermissions(Permission.NOTIFICATION_PREFERENCES),
  notificationController.preferences,
);

notificationRouter.put(
  "/preferences",
  requirePermissions(Permission.NOTIFICATION_PREFERENCES),
  validate(notificationPreferenceValidation),
  notificationController.updatePreferences,
);

notificationRouter.put(
  "/:id/read",
  requirePermissions(Permission.NOTIFICATION_UPDATE),
  validate(notificationIdValidation),
  notificationController.markRead,
);

notificationRouter.patch(
  "/:id/read",
  requirePermissions(Permission.NOTIFICATION_UPDATE),
  validate(notificationIdValidation),
  notificationController.markRead,
);

notificationRouter.delete(
  "/:id",
  requirePermissions(Permission.NOTIFICATION_UPDATE),
  validate(notificationIdValidation),
  notificationController.remove,
);
