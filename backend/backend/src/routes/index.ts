import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { extractOrganization } from "../middlewares/organization.middleware";
import { planRateLimiter } from "../middlewares/rate-limit.middleware";
import { assetRouter } from "./asset.routes";
import { auditRouter } from "./audit.routes";
import { authRouter } from "./auth.routes";
import { categoryRouter } from "./category.routes";
import { departmentRouter } from "./department.routes";
import { grnRouter } from "./grn.routes";
import { inventoryRouter } from "./inventory.routes";
import { itemRouter } from "./item.routes";
import { notificationRouter } from "./notification.routes";
import { organisationRouter } from "./organisation.routes";
import { organizationRouter } from "./organization.routes";
import { paymentRouter } from "./payment.routes";
import { procurementRouter } from "./procurement.routes";
import { purchaseOrderRouter } from "./purchaseOrder.routes";
import { reportRouter } from "./report.routes";
import { requestRouter } from "./request.routes";
import { roleRouter } from "./role.routes";
import { stockRouter } from "./stock.routes";
import { userRouter } from "./user.routes";
import { vendorRouter } from "./vendor.routes";
import { warehouseRouter } from "./warehouse.routes";

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
  "/roles",
  authenticate,
  extractOrganization,
  planRateLimiter,
  roleRouter,
);
apiRouter.use(
  "/warehouses",
  authenticate,
  extractOrganization,
  planRateLimiter,
  warehouseRouter,
);
apiRouter.use(
  "/items",
  authenticate,
  extractOrganization,
  planRateLimiter,
  itemRouter,
);
apiRouter.use(
  "/categories",
  authenticate,
  extractOrganization,
  planRateLimiter,
  categoryRouter,
);
apiRouter.use(
  "/departments",
  authenticate,
  extractOrganization,
  planRateLimiter,
  departmentRouter,
);
apiRouter.use(
  "/stock",
  authenticate,
  extractOrganization,
  planRateLimiter,
  stockRouter,
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
  "/assets",
  authenticate,
  extractOrganization,
  planRateLimiter,
  assetRouter,
);
apiRouter.use(
  "/vendors",
  authenticate,
  extractOrganization,
  planRateLimiter,
  vendorRouter,
);
apiRouter.use(
  "/purchase-orders",
  authenticate,
  extractOrganization,
  planRateLimiter,
  purchaseOrderRouter,
);
apiRouter.use(
  "/grn",
  authenticate,
  extractOrganization,
  planRateLimiter,
  grnRouter,
);
apiRouter.use(
  "/payments",
  authenticate,
  extractOrganization,
  planRateLimiter,
  paymentRouter,
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
