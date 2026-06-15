import { Router } from "express";
import { Permission, PlanFeature } from "../constants";
import { organisationController } from "../controllers/organisation.controller";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { extractOrganization } from "../middlewares/organization.middleware";
import { checkPlanLimit } from "../middlewares/plan-limit.middleware";
import { planRateLimiter } from "../middlewares/rate-limit.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  masterDataUpdateValidation,
  masterDataValidation,
  organizationValidation,
  organizationUpdateValidation,
} from "../validations/organisation.validation";

export const organisationRouter = Router();

organisationRouter
  .route("/")
  .get(
    requirePermissions(Permission.ORGANISATION_MANAGE),
    organisationController.listOrganizations,
  )
  .post(
    requirePermissions(Permission.ORGANISATION_MANAGE),
    validate(organizationValidation),
    organisationController.createOrganization,
  );

organisationRouter
  .route("/current")
  .get(
    requirePermissions(Permission.ORGANISATION_READ),
    organisationController.getCurrentOrganization,
  )
  .patch(
    requirePermissions(Permission.ORGANISATION_MANAGE),
    validate(organizationUpdateValidation),
    organisationController.updateCurrentOrganization,
  );

organisationRouter.patch(
  "/:id",
  requirePermissions(Permission.ORGANISATION_MANAGE),
  validate(organizationUpdateValidation),
  organisationController.updateOrganization,
);

organisationRouter
  .route("/departments")
  .get(
    requirePermissions(Permission.MASTER_DATA_READ),
    organisationController.listDepartments,
  )
  .post(
    requirePermissions(Permission.MASTER_DATA_MANAGE),
    validate(masterDataValidation),
    organisationController.createDepartment,
  );
organisationRouter.patch(
  "/departments/:id",
  requirePermissions(Permission.MASTER_DATA_MANAGE),
  validate(masterDataUpdateValidation),
  organisationController.updateDepartment,
);

organisationRouter
  .route("/warehouses")
  .get(
    requirePermissions(Permission.MASTER_DATA_READ),
    organisationController.listWarehouses,
  )
  .post(
    extractOrganization,
    planRateLimiter,
    requirePermissions(Permission.MASTER_DATA_MANAGE),
    checkPlanLimit(PlanFeature.WAREHOUSES),
    validate(masterDataValidation),
    organisationController.createWarehouse,
  );
organisationRouter.patch(
  "/warehouses/:id",
  requirePermissions(Permission.MASTER_DATA_MANAGE),
  validate(masterDataUpdateValidation),
  organisationController.updateWarehouse,
);

organisationRouter
  .route("/categories")
  .get(
    requirePermissions(Permission.MASTER_DATA_READ),
    organisationController.listCategories,
  )
  .post(
    requirePermissions(Permission.MASTER_DATA_MANAGE),
    validate(masterDataValidation),
    organisationController.createCategory,
  );
organisationRouter.patch(
  "/categories/:id",
  requirePermissions(Permission.MASTER_DATA_MANAGE),
  validate(masterDataUpdateValidation),
  organisationController.updateCategory,
);
