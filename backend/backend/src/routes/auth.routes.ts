import { Router } from "express";
import { Permission, PlanFeature } from "../constants";
import { authController } from "../controllers/auth.controller";
import { organisationController } from "../controllers/organisation.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { extractOrganization } from "../middlewares/organization.middleware";
import { checkOwnership } from "../middlewares/ownership.middleware";
import { checkPlanLimit } from "../middlewares/plan-limit.middleware";
import { planRateLimiter } from "../middlewares/rate-limit.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  acceptInviteValidation,
  forgotPasswordValidation,
  inviteUserValidation,
  loginValidation,
  refreshValidation,
  resetPasswordValidation,
  verifyEmailValidation,
} from "../validations/auth.validation";
import { organizationRegisterValidation } from "../validations/organisation.validation";

export const authRouter = Router();

authRouter.post(
  "/register",
  validate(organizationRegisterValidation),
  organisationController.register,
);
authRouter.post("/login", validate(loginValidation), authController.login);
authRouter.post(
  "/refresh-token",
  validate(refreshValidation),
  authController.refresh,
);
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
  "/verify-email",
  validate(verifyEmailValidation),
  authController.verifyEmail,
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
  checkPermission(Permission.USER_INVITE),
  checkPlanLimit(PlanFeature.USERS),
  validate(inviteUserValidation),
  checkOwnership,
  authController.invite,
);
