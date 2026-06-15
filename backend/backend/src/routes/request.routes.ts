import { Router } from "express";
import { Permission } from "../constants/permissions";
import { requestController } from "../controllers/request.controller";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createRequestValidation,
  overrideRequestValidation,
  rejectRequestValidation,
  requestIdValidation,
  requestListValidation,
} from "../validations/request.validation";

export const requestRouter = Router();

requestRouter
  .route("/")
  .get(
    requirePermissions(Permission.REQUEST_READ),
    validate(requestListValidation),
    requestController.list,
  )
  .post(
    requirePermissions(Permission.REQUEST_CREATE),
    validate(createRequestValidation),
    requestController.create,
  );
requestRouter.get(
  "/:id",
  requirePermissions(Permission.REQUEST_READ),
  validate(requestIdValidation),
  requestController.get,
);
requestRouter.post(
  "/:id/approve",
  requirePermissions(Permission.REQUEST_APPROVE),
  validate(requestIdValidation),
  requestController.approve,
);
requestRouter.post(
  "/:id/reject",
  requirePermissions(Permission.REQUEST_APPROVE),
  validate(rejectRequestValidation),
  requestController.reject,
);
requestRouter.post(
  "/:id/fulfill",
  requirePermissions(Permission.REQUEST_FULFILL),
  validate(requestIdValidation),
  requestController.fulfill,
);
requestRouter.post(
  "/:id/override",
  requirePermissions(Permission.REQUEST_OVERRIDE),
  validate(overrideRequestValidation),
  requestController.override,
);
