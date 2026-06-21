import { Router } from "express";
import { Permission } from "../constants/permissions";
import { apiKeyController } from "../controllers/apiKey.controller";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  apiKeyCreateValidation,
  apiKeyIdValidation,
  apiKeyListValidation,
  apiKeyRevokeValidation,
  apiKeyUpdateValidation,
  apiKeyUsageValidation,
} from "../validations/apiKey.validation";

export const apiKeyRouter = Router();

apiKeyRouter.get(
  "/",
  requirePermissions(Permission.APIKEY_READ),
  validate(apiKeyListValidation),
  apiKeyController.list,
);

apiKeyRouter.post(
  "/",
  requirePermissions(Permission.APIKEY_CREATE),
  validate(apiKeyCreateValidation),
  apiKeyController.create,
);

apiKeyRouter.get(
  "/:id",
  requirePermissions(Permission.APIKEY_READ),
  validate(apiKeyIdValidation),
  apiKeyController.get,
);

apiKeyRouter.put(
  "/:id",
  requirePermissions(Permission.APIKEY_CREATE),
  validate(apiKeyUpdateValidation),
  apiKeyController.update,
);

apiKeyRouter.post(
  "/:id/rotate",
  requirePermissions(Permission.APIKEY_ROTATE),
  validate(apiKeyIdValidation),
  apiKeyController.rotate,
);

apiKeyRouter.post(
  "/:id/revoke",
  requirePermissions(Permission.APIKEY_DELETE),
  validate(apiKeyRevokeValidation),
  apiKeyController.revoke,
);

apiKeyRouter.delete(
  "/:id",
  requirePermissions(Permission.APIKEY_DELETE),
  validate(apiKeyIdValidation),
  apiKeyController.remove,
);

apiKeyRouter.get(
  "/:id/usage",
  requirePermissions(Permission.APIKEY_READ),
  validate(apiKeyUsageValidation),
  apiKeyController.usage,
);
