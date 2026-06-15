import { Router } from "express";
import { Permission } from "../constants";
import { organisationController } from "../controllers/organisation.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { extractOrganization } from "../middlewares/organization.middleware";
import { planRateLimiter } from "../middlewares/rate-limit.middleware";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  organizationRegisterValidation,
  organizationUpdateValidation,
  organizationUpgradeValidation,
} from "../validations/organisation.validation";

export const organizationRouter = Router();

organizationRouter.post(
  "/register",
  validate(organizationRegisterValidation),
  organisationController.register,
);
organizationRouter.post(
  "/webhook/razorpay",
  organisationController.razorpayWebhook,
);

organizationRouter.get(
  "/me",
  authenticate,
  extractOrganization,
  planRateLimiter,
  requirePermissions(Permission.ORGANIZATION_READ),
  organisationController.me,
);
organizationRouter.put(
  "/me",
  authenticate,
  extractOrganization,
  planRateLimiter,
  requirePermissions(Permission.ORGANIZATION_UPDATE),
  validate(organizationUpdateValidation),
  organisationController.updateMe,
);
organizationRouter.get(
  "/usage",
  authenticate,
  extractOrganization,
  planRateLimiter,
  requirePermissions(Permission.ORGANIZATION_READ),
  organisationController.usage,
);
organizationRouter.post(
  "/upgrade",
  authenticate,
  extractOrganization,
  planRateLimiter,
  requirePermissions(Permission.BILLING_MANAGE),
  validate(organizationUpgradeValidation),
  organisationController.upgrade,
);
