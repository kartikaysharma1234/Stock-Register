import { Router } from "express";
import { grnRouter } from "./grn.routes";
import { paymentRouter } from "./payment.routes";
import { purchaseOrderRouter } from "./purchaseOrder.routes";
import { vendorRouter } from "./vendor.routes";

export const procurementRouter = Router();

procurementRouter.use("/vendors", vendorRouter);
procurementRouter.use("/purchase-orders", purchaseOrderRouter);
procurementRouter.use("/grn", grnRouter);
procurementRouter.use("/grns", grnRouter);
procurementRouter.use("/payments", paymentRouter);
