import { Router } from "express";
import { Permission } from "../constants";
import { procurementController } from "../controllers/procurement.controller";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createPaymentValidation,
  paymentListValidation,
} from "../validations/procurement.validation";

export const paymentRouter = Router();

paymentRouter
  .route("/")
  .get(
    requirePermissions(Permission.PAYMENT_READ),
    validate(paymentListValidation),
    procurementController.listPayments,
  )
  .post(
    requirePermissions(Permission.PAYMENT_CREATE),
    validate(createPaymentValidation),
    procurementController.createPayment,
  );
