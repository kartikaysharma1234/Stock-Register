import { Router } from "express";
import { Permission } from "../constants/permissions";
import { userController } from "../controllers/user.controller";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  userListValidation,
  userUpdateValidation,
} from "../validations/user.validation";

export const userRouter = Router();

userRouter.get(
  "/",
  requirePermissions(Permission.USER_READ),
  validate(userListValidation),
  userController.list,
);
userRouter.patch(
  "/:id",
  requirePermissions(Permission.USER_MANAGE),
  validate(userUpdateValidation),
  userController.update,
);
