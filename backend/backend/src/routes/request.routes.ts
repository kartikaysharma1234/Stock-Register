import { Router } from "express";
import { Permission } from "../constants";
import { requestController } from "../controllers/request.controller";
import { checkPermission } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  approveRequestValidation,
  cancelRequestValidation,
  createRequestValidation,
  fulfillRequestValidation,
  overrideRequestValidation,
  rejectRequestValidation,
  requestIdValidation,
  requestListValidation,
  submitRequestValidation,
  updateRequestValidation,
} from "../validations/request.validation";

export const requestRouter = Router();

requestRouter.get(
  "/pending",
  checkPermission(Permission.REQUEST_READ),
  validate(requestListValidation),
  requestController.pending,
);
requestRouter.get(
  "/",
  checkPermission(Permission.REQUEST_READ),
  validate(requestListValidation),
  requestController.list,
);
requestRouter.post(
  "/",
  checkPermission(Permission.REQUEST_CREATE),
  validate(createRequestValidation),
  requestController.create,
);
requestRouter.get(
  "/:id",
  checkPermission(Permission.REQUEST_READ),
  validate(requestIdValidation),
  requestController.get,
);
requestRouter.put(
  "/:id",
  checkPermission(Permission.REQUEST_UPDATE),
  validate(updateRequestValidation),
  requestController.update,
);
requestRouter.post(
  "/:id/submit",
  checkPermission(Permission.REQUEST_UPDATE),
  validate(submitRequestValidation),
  requestController.submit,
);
requestRouter.post(
  "/:id/approve",
  checkPermission(Permission.REQUEST_APPROVE),
  validate(approveRequestValidation),
  requestController.approve,
);
requestRouter.post(
  "/:id/reject",
  checkPermission(Permission.REQUEST_REJECT),
  validate(rejectRequestValidation),
  requestController.reject,
);
requestRouter.post(
  "/:id/fulfill",
  checkPermission(Permission.REQUEST_FULFILL),
  validate(fulfillRequestValidation),
  requestController.fulfill,
);
requestRouter.post(
  "/:id/cancel",
  checkPermission(Permission.REQUEST_CANCEL),
  validate(cancelRequestValidation),
  requestController.cancel,
);
requestRouter.post(
  "/:id/override",
  checkPermission(Permission.REQUEST_OVERRIDE),
  validate(overrideRequestValidation),
  requestController.override,
);
