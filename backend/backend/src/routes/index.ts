import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { extractOrganization } from "../middlewares/organization.middleware";
import { planRateLimiter } from "../middlewares/rate-limit.middleware";
import { auditRouter } from "./audit.routes";
import { authRouter } from "./auth.routes";
import { inventoryRouter } from "./inventory.routes";
import { notificationRouter } from "./notification.routes";
import { organisationRouter } from "./organisation.routes";
import { organizationRouter } from "./organization.routes";
import { procurementRouter } from "./procurement.routes";
import { reportRouter } from "./report.routes";
import { requestRouter } from "./request.routes";
import { userRouter } from "./user.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/organizations", organizationRouter);
apiRouter.use("/organisations", authenticate, organisationRouter);
apiRouter.use(
  "/users",
  authenticate,
  extractOrganization,
  planRateLimiter,
  userRouter,
);
apiRouter.use(
  "/inventory",
  authenticate,
  extractOrganization,
  planRateLimiter,
  inventoryRouter,
);
apiRouter.use(
  "/requests",
  authenticate,
  extractOrganization,
  planRateLimiter,
  requestRouter,
);
apiRouter.use(
  "/procurement",
  authenticate,
  extractOrganization,
  planRateLimiter,
  procurementRouter,
);
apiRouter.use(
  "/reports",
  authenticate,
  extractOrganization,
  planRateLimiter,
  reportRouter,
);
apiRouter.use(
  "/notifications",
  authenticate,
  extractOrganization,
  planRateLimiter,
  notificationRouter,
);
apiRouter.use(
  "/audit-logs",
  authenticate,
  extractOrganization,
  planRateLimiter,
  auditRouter,
);
