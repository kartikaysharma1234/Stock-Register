import { Router } from "express";
import { Permission } from "../constants";
import { procurementController } from "../controllers/procurement.controller";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  cancelPurchaseOrderValidation,
  createGrnValidation,
  createPurchaseOrderValidation,
  purchaseOrderIdValidation,
  purchaseOrderListValidation,
  rejectPurchaseOrderValidation,
  updatePurchaseOrderValidation,
} from "../validations/procurement.validation";

export const purchaseOrderRouter = Router();

purchaseOrderRouter
  .route("/")
  .get(
    requirePermissions(Permission.PURCHASE_READ),
    validate(purchaseOrderListValidation),
    procurementController.listPurchaseOrders,
  )
  .post(
    requirePermissions(Permission.PURCHASE_CREATE),
    validate(createPurchaseOrderValidation),
    procurementController.createPurchaseOrder,
  );

purchaseOrderRouter.post(
  "/:id/submit",
  requirePermissions(Permission.PURCHASE_UPDATE),
  validate(purchaseOrderIdValidation),
  procurementController.submitPurchaseOrder,
);

purchaseOrderRouter.post(
  "/:id/approve",
  requirePermissions(Permission.PURCHASE_APPROVE),
  validate(purchaseOrderIdValidation),
  procurementController.approvePurchaseOrder,
);

purchaseOrderRouter.post(
  "/:id/reject",
  requirePermissions(Permission.PURCHASE_APPROVE),
  validate(rejectPurchaseOrderValidation),
  procurementController.rejectPurchaseOrder,
);

purchaseOrderRouter.post(
  "/:id/send",
  requirePermissions(Permission.PURCHASE_SEND),
  validate(purchaseOrderIdValidation),
  procurementController.sendPurchaseOrder,
);

purchaseOrderRouter.post(
  "/:id/cancel",
  requirePermissions(Permission.PURCHASE_CANCEL),
  validate(cancelPurchaseOrderValidation),
  procurementController.cancelPurchaseOrder,
);

purchaseOrderRouter.post(
  "/:id/grn",
  requirePermissions(Permission.GRN_CREATE),
  validate(createGrnValidation),
  procurementController.createGrn,
);

purchaseOrderRouter
  .route("/:id")
  .get(
    requirePermissions(Permission.PURCHASE_READ),
    validate(purchaseOrderIdValidation),
    procurementController.getPurchaseOrder,
  )
  .put(
    requirePermissions(Permission.PURCHASE_UPDATE),
    validate(updatePurchaseOrderValidation),
    procurementController.updatePurchaseOrder,
  )
  .patch(
    requirePermissions(Permission.PURCHASE_UPDATE),
    validate(updatePurchaseOrderValidation),
    procurementController.updatePurchaseOrder,
  );
