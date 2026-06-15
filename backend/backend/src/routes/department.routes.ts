import { Router } from "express";
import { Permission } from "../constants";
import { departmentController } from "../controllers/department.controller";
import { checkPermission } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  departmentCreateValidation,
  departmentIdValidation,
  departmentListValidation,
  departmentRequestsValidation,
  departmentUpdateValidation,
} from "../validations/department.validation";

export const departmentRouter = Router();

departmentRouter.get(
  "/",
  checkPermission(Permission.DEPARTMENT_READ),
  validate(departmentListValidation),
  departmentController.list,
);
departmentRouter.post(
  "/",
  checkPermission(Permission.DEPARTMENT_CREATE),
  validate(departmentCreateValidation),
  departmentController.create,
);
departmentRouter.get(
  "/:id/requests",
  checkPermission(Permission.REQUEST_READ),
  validate(departmentRequestsValidation),
  departmentController.requests,
);
departmentRouter.get(
  "/:id/budget",
  checkPermission(Permission.DEPARTMENT_READ),
  validate(departmentIdValidation),
  departmentController.budget,
);
departmentRouter.get(
  "/:id",
  checkPermission(Permission.DEPARTMENT_READ),
  validate(departmentIdValidation),
  departmentController.get,
);
departmentRouter.put(
  "/:id",
  checkPermission(Permission.DEPARTMENT_UPDATE),
  validate(departmentUpdateValidation),
  departmentController.update,
);
departmentRouter.delete(
  "/:id",
  checkPermission(Permission.DEPARTMENT_DELETE),
  validate(departmentIdValidation),
  departmentController.remove,
);
