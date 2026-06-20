import {
  AssetAction,
  AssetStatus,
  CounterType,
  DepreciationMethod,
  Permission,
  ROLE_PERMISSIONS,
  Role,
} from "../constants";
import { formatCounterNumber } from "../repository/counter.repository";
import { AssetLogModel, AssetModel } from "../repository/schemas";
import {
  assignAssetValidation,
  createAssetValidation,
  maintenanceAssetValidation,
  updateAssetValidation,
} from "./asset.validation";

const organizationId = "507f1f77bcf86cd799439011";
const itemId = "507f191e810c19729de860ea";
const warehouseId = "507f191e810c19729de860eb";
const zoneId = "507f191e810c19729de860ec";
const assetId = "507f191e810c19729de860ed";
const userId = "507f191e810c19729de860ee";

describe("Module 7 asset management", () => {
  it("defines asset lifecycle, depreciation, and maintenance fields", () => {
    expect(AssetModel.schema.path("assetTag")).toBeDefined();
    expect(AssetModel.schema.path("itemId")).toBeDefined();
    expect(AssetModel.schema.path("warehouseId")).toBeDefined();
    expect(AssetModel.schema.path("zoneId")).toBeDefined();
    expect(AssetModel.schema.path("status")).toBeDefined();
    expect(AssetModel.schema.path("assignedTo")).toBeDefined();
    expect(AssetModel.schema.path("expectedReturnDate")).toBeDefined();
    expect(AssetModel.schema.path("purchaseCost")).toBeDefined();
    expect(AssetModel.schema.path("currentValue")).toBeDefined();
    expect(AssetModel.schema.path("depreciationMethod")).toBeDefined();
    expect(AssetModel.schema.path("maintenanceSchedule")).toBeDefined();
    expect(AssetModel.schema.path("maintenanceSchedule.nextDue")).toBeDefined();
    expect(AssetModel.schema.path("isDeleted")).toBeDefined();
    expect(AssetModel.schema.path("status").options.default).toBe(
      AssetStatus.AVAILABLE,
    );
  });

  it("defines asset lifecycle logs", () => {
    expect(AssetLogModel.schema.path("assetId")).toBeDefined();
    expect(AssetLogModel.schema.path("action")).toBeDefined();
    expect(AssetLogModel.schema.path("performedBy")).toBeDefined();
    expect(AssetLogModel.schema.path("assignedTo")).toBeDefined();
    expect(AssetLogModel.schema.path("cost")).toBeDefined();
    expect(AssetLogModel.schema.path("isDeleted")).toBeDefined();
  });

  it("formats asset tags without yearly reset", () => {
    expect(formatCounterNumber(CounterType.ASSET, 2026, 7)).toBe("AST-0007");
    expect(formatCounterNumber(CounterType.PURCHASE_ORDER, 2026, 7)).toBe(
      "PO-2026-0007",
    );
  });

  it("accepts asset create input and coerces depreciation fields", () => {
    const result = createAssetValidation.parse({
      body: {
        organizationId,
        itemId,
        name: "Laptop 15",
        category: "IT Equipment",
        warehouseId,
        zoneId,
        purchaseDate: "2026-06-20",
        purchaseCost: "90000",
        depreciationMethod: "DECLINING_BALANCE",
        depreciationRate: "20",
        maintenanceSchedule: [
          {
            type: "Quarterly check",
            intervalDays: "90",
            lastDone: "2026-06-20",
          },
        ],
      },
    });

    expect(result.body.depreciationMethod).toBe(
      DepreciationMethod.DECLINING_BALANCE,
    );
    expect(result.body.purchaseCost).toBe(90000);
    expect(result.body.maintenanceSchedule?.[0].intervalDays).toBe(90);
  });

  it("rejects empty updates and invalid warranty ranges", () => {
    expect(
      updateAssetValidation.safeParse({
        params: { id: assetId },
        query: {},
        body: {},
      }).success,
    ).toBe(false);

    expect(
      createAssetValidation.safeParse({
        body: {
          itemId,
          name: "Printer",
          warehouseId,
          purchaseDate: "2026-06-20",
          warrantyExpiry: "2026-01-01",
        },
      }).success,
    ).toBe(false);
  });

  it("validates assignment and maintenance payloads", () => {
    const assigned = assignAssetValidation.parse({
      params: { id: assetId },
      query: {},
      body: {
        assignedTo: userId,
        expectedReturnDate: "2030-01-01",
      },
    });
    const maintenance = maintenanceAssetValidation.parse({
      params: { id: assetId },
      query: {},
      body: {
        maintenanceType: "Quarterly check",
        intervalDays: "90",
        completed: true,
        nextDue: "2030-01-01",
        cost: "1200",
      },
    });

    expect(assigned.body.assignedTo).toBe(userId);
    expect(maintenance.body.cost).toBe(1200);
    expect(maintenance.body.intervalDays).toBe(90);
  });

  it("maps module permissions to asset roles", () => {
    expect(ROLE_PERMISSIONS[Role.ADMIN]).toEqual(
      expect.arrayContaining([
        Permission.ASSET_CREATE,
        Permission.ASSET_ASSIGN,
        Permission.ASSET_DISPOSE,
      ]),
    );
    expect(ROLE_PERMISSIONS[Role.STORE_MANAGER]).toEqual(
      expect.arrayContaining([
        Permission.ASSET_READ,
        Permission.ASSET_ASSIGN,
        Permission.ASSET_RETURN,
        Permission.ASSET_MAINTAIN,
      ]),
    );
    expect(ROLE_PERMISSIONS[Role.VIEWER]).toEqual(
      expect.arrayContaining([Permission.ASSET_READ]),
    );
    expect(Object.values(AssetAction)).toEqual(
      expect.arrayContaining([
        AssetAction.ASSIGNED,
        AssetAction.RETURNED,
        AssetAction.MAINTENANCE_DONE,
        AssetAction.DISPOSED,
      ]),
    );
  });
});
