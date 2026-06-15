import { Router } from "express";
import { Permission } from "../constants/permissions";
import { procurementController } from "../controllers/procurement.controller";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createGrnValidation,
  createPurchaseOrderValidation,
  purchaseOrderIdValidation,
  purchaseOrderListValidation,
  rejectPurchaseOrderValidation,
  updateVendorValidation,
  vendorValidation,
} from "../validations/procurement.validation";

export const procurementRouter = Router();

procurementRouter
  .route("/vendors")
  .get(
    requirePermissions(Permission.PROCUREMENT_READ),
    procurementController.listVendors,
  )
  .post(
    requirePermissions(Permission.PROCUREMENT_MANAGE),
    validate(vendorValidation),
    procurementController.createVendor,
  );
procurementRouter.patch(
  "/vendors/:id",
  requirePermissions(Permission.PROCUREMENT_MANAGE),
  validate(updateVendorValidation),
  procurementController.updateVendor,
);

procurementRouter
  .route("/purchase-orders")
  .get(
    requirePermissions(Permission.PROCUREMENT_READ),
    validate(purchaseOrderListValidation),
    procurementController.listPurchaseOrders,
  )
  .post(
    requirePermissions(Permission.PROCUREMENT_MANAGE),
    validate(createPurchaseOrderValidation),
    procurementController.createPurchaseOrder,
  );
procurementRouter.get(
  "/purchase-orders/:id",
  requirePermissions(Permission.PROCUREMENT_READ),
  validate(purchaseOrderIdValidation),
  procurementController.getPurchaseOrder,
);
procurementRouter.post(
  "/purchase-orders/:id/submit",
  requirePermissions(Permission.PROCUREMENT_MANAGE),
  validate(purchaseOrderIdValidation),
  procurementController.submitPurchaseOrder,
);
procurementRouter.post(
  "/purchase-orders/:id/approve",
  requirePermissions(Permission.PO_APPROVE),
  validate(purchaseOrderIdValidation),
  procurementController.approvePurchaseOrder,
);
procurementRouter.post(
  "/purchase-orders/:id/reject",
  requirePermissions(Permission.PO_APPROVE),
  validate(rejectPurchaseOrderValidation),
  procurementController.rejectPurchaseOrder,
);
procurementRouter.post(
  "/purchase-orders/:id/grn",
  requirePermissions(Permission.GRN_CREATE),
  validate(createGrnValidation),
  procurementController.receiveGoods,
);
procurementRouter.get(
  "/grns",
  requirePermissions(Permission.PROCUREMENT_READ),
  procurementController.listGrns,
);
