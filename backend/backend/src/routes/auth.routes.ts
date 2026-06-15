import { Router } from "express";
import { Permission } from "../constants/permissions";
import { authController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  acceptInviteValidation,
  forgotPasswordValidation,
  inviteUserValidation,
  loginValidation,
  refreshValidation,
  resetPasswordValidation,
} from "../validations/auth.validation";

export const authRouter = Router();

authRouter.post("/login", validate(loginValidation), authController.login);
authRouter.post("/refresh", validate(refreshValidation), authController.refresh);
authRouter.post("/logout", validate(refreshValidation), authController.logout);
authRouter.post(
  "/forgot-password",
  validate(forgotPasswordValidation),
  authController.forgotPassword,
);
authRouter.post(
  "/reset-password",
  validate(resetPasswordValidation),
  authController.resetPassword,
);
authRouter.post(
  "/accept-invite",
  validate(acceptInviteValidation),
  authController.acceptInvite,
);
authRouter.post(
  "/invite",
  authenticate,
  requirePermissions(Permission.USER_MANAGE),
  validate(inviteUserValidation),
  authController.invite,
);
