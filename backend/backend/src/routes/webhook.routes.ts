import { Router } from "express";
import { Permission } from "../constants/permissions";
import { webhookController } from "../controllers/webhook.controller";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  webhookCreateValidation,
  webhookDeliveryListValidation,
  webhookIdValidation,
  webhookListValidation,
  webhookUpdateValidation,
} from "../validations/webhook.validation";

export const webhookRouter = Router();

webhookRouter.get(
  "/",
  requirePermissions(Permission.WEBHOOK_READ),
  validate(webhookListValidation),
  webhookController.list,
);

webhookRouter.post(
  "/",
  requirePermissions(Permission.WEBHOOK_CREATE),
  validate(webhookCreateValidation),
  webhookController.create,
);

webhookRouter.get(
  "/:id",
  requirePermissions(Permission.WEBHOOK_READ),
  validate(webhookIdValidation),
  webhookController.get,
);

webhookRouter.put(
  "/:id",
  requirePermissions(Permission.WEBHOOK_UPDATE),
  validate(webhookUpdateValidation),
  webhookController.update,
);

webhookRouter.post(
  "/:id/rotate-secret",
  requirePermissions(Permission.WEBHOOK_UPDATE),
  validate(webhookIdValidation),
  webhookController.rotateSecret,
);

webhookRouter.post(
  "/:id/test",
  requirePermissions(Permission.WEBHOOK_TEST),
  validate(webhookIdValidation),
  webhookController.test,
);

webhookRouter.get(
  "/:id/deliveries",
  requirePermissions(Permission.WEBHOOK_READ),
  validate(webhookDeliveryListValidation),
  webhookController.deliveries,
);

webhookRouter.delete(
  "/:id",
  requirePermissions(Permission.WEBHOOK_DELETE),
  validate(webhookIdValidation),
  webhookController.remove,
);
