import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { auditRouter } from "./audit.routes";
import { authRouter } from "./auth.routes";
import { inventoryRouter } from "./inventory.routes";
import { notificationRouter } from "./notification.routes";
import { organisationRouter } from "./organisation.routes";
import { procurementRouter } from "./procurement.routes";
import { reportRouter } from "./report.routes";
import { requestRouter } from "./request.routes";
import { userRouter } from "./user.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/organisations", authenticate, organisationRouter);
apiRouter.use("/users", authenticate, userRouter);
apiRouter.use("/inventory", authenticate, inventoryRouter);
apiRouter.use("/requests", authenticate, requestRouter);
apiRouter.use("/procurement", authenticate, procurementRouter);
apiRouter.use("/reports", authenticate, reportRouter);
apiRouter.use("/notifications", authenticate, notificationRouter);
apiRouter.use("/audit-logs", authenticate, auditRouter);
