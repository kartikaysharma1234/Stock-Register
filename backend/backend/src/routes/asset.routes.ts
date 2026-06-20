import { Router } from "express";
import { Permission } from "../constants";
import { assetController } from "../controllers/asset.controller";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  assetIdValidation,
  assetHistoryValidation,
  assetListValidation,
  assignAssetValidation,
  assignedAssetValidation,
  createAssetValidation,
  disposeAssetValidation,
  dueMaintenanceValidation,
  maintenanceAssetValidation,
  returnAssetValidation,
  updateAssetValidation,
} from "../validations/asset.validation";

export const assetRouter = Router();

assetRouter
  .route("/")
  .get(
    requirePermissions(Permission.ASSET_READ),
    validate(assetListValidation),
    assetController.list,
  )
  .post(
    requirePermissions(Permission.ASSET_CREATE),
    validate(createAssetValidation),
    assetController.create,
  );

assetRouter.get(
  "/due-maintenance",
  requirePermissions(Permission.ASSET_READ),
  validate(dueMaintenanceValidation),
  assetController.dueMaintenance,
);

assetRouter.get(
  "/assigned/:userId",
  requirePermissions(Permission.ASSET_READ),
  validate(assignedAssetValidation),
  assetController.assignedToUser,
);

assetRouter.get(
  "/:id/history",
  requirePermissions(Permission.ASSET_READ),
  validate(assetHistoryValidation),
  assetController.history,
);

assetRouter.post(
  "/:id/assign",
  requirePermissions(Permission.ASSET_ASSIGN),
  validate(assignAssetValidation),
  assetController.assign,
);

assetRouter.post(
  "/:id/return",
  requirePermissions(Permission.ASSET_RETURN),
  validate(returnAssetValidation),
  assetController.returnAsset,
);

assetRouter.post(
  "/:id/maintenance",
  requirePermissions(Permission.ASSET_MAINTAIN),
  validate(maintenanceAssetValidation),
  assetController.maintenance,
);

assetRouter.post(
  "/:id/dispose",
  requirePermissions(Permission.ASSET_DISPOSE),
  validate(disposeAssetValidation),
  assetController.dispose,
);

assetRouter
  .route("/:id")
  .get(
    requirePermissions(Permission.ASSET_READ),
    validate(assetIdValidation),
    assetController.get,
  )
  .put(
    requirePermissions(Permission.ASSET_UPDATE),
    validate(updateAssetValidation),
    assetController.update,
  )
  .patch(
    requirePermissions(Permission.ASSET_UPDATE),
    validate(updateAssetValidation),
    assetController.update,
  );
