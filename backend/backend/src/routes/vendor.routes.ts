import { Router } from "express";
import { Permission } from "../constants";
import { procurementController } from "../controllers/procurement.controller";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  updateVendorValidation,
  vendorCompareValidation,
  vendorIdValidation,
  vendorListValidation,
  vendorValidation,
} from "../validations/procurement.validation";

export const vendorRouter = Router();

vendorRouter
  .route("/")
  .get(
    requirePermissions(Permission.VENDOR_READ),
    validate(vendorListValidation),
    procurementController.listVendors,
  )
  .post(
    requirePermissions(Permission.VENDOR_CREATE),
    validate(vendorValidation),
    procurementController.createVendor,
  );

vendorRouter.get(
  "/compare",
  requirePermissions(Permission.VENDOR_READ),
  validate(vendorCompareValidation),
  procurementController.compareVendors,
);

vendorRouter.get(
  "/:id/orders",
  requirePermissions(Permission.PURCHASE_READ),
  validate(vendorIdValidation),
  procurementController.vendorOrders,
);

vendorRouter.get(
  "/:id/payments",
  requirePermissions(Permission.PAYMENT_READ),
  validate(vendorIdValidation),
  procurementController.vendorPayments,
);

vendorRouter
  .route("/:id")
  .get(
    requirePermissions(Permission.VENDOR_READ),
    validate(vendorIdValidation),
    procurementController.getVendor,
  )
  .put(
    requirePermissions(Permission.VENDOR_UPDATE),
    validate(updateVendorValidation),
    procurementController.updateVendor,
  )
  .patch(
    requirePermissions(Permission.VENDOR_UPDATE),
    validate(updateVendorValidation),
    procurementController.updateVendor,
  )
  .delete(
    requirePermissions(Permission.VENDOR_DELETE),
    validate(vendorIdValidation),
    procurementController.deleteVendor,
  );
