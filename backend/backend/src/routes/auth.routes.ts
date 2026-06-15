import { Router } from "express";
import { Permission, PlanFeature } from "../constants";
import { authController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { extractOrganization } from "../middlewares/organization.middleware";
import { checkPlanLimit } from "../middlewares/plan-limit.middleware";
import { planRateLimiter } from "../middlewares/rate-limit.middleware";
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
  extractOrganization,
  planRateLimiter,
  requirePermissions(Permission.USER_MANAGE),
  checkPlanLimit(PlanFeature.USERS),
  validate(inviteUserValidation),
  authController.invite,
);
