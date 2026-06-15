import { Permission, Role, StockMovementType, WarehouseType } from "../constants";
import {
  WarehouseModel,
  WarehouseZoneModel,
} from "../repository/schemas";
import { AuthUser } from "../types/auth";
import {
  canManageWarehouse,
  canReadWarehouse,
} from "../services/warehouse.service";
import {
  warehouseCreateValidation,
  warehouseListValidation,
  warehouseMovementValidation,
  warehouseUpdateValidation,
  warehouseZoneUpdateValidation,
} from "./warehouse.validation";

const objectId = "507f1f77bcf86cd799439011";
const otherObjectId = "507f191e810c19729de860ea";

const actor = (
  role: Role,
  warehouseIds: string[] = [],
): AuthUser => ({
  id: objectId,
  organizationId: otherObjectId,
  role,
  permissions: [Permission.WAREHOUSE_READ],
  departmentIds: [],
  warehouseIds,
});

describe("Module 3 warehouse management", () => {
  it("defines the warehouse and zone persistence fields", () => {
    expect(WarehouseModel.schema.path("organizationId")).toBeDefined();
    expect(WarehouseModel.schema.path("type")).toBeDefined();
    expect(WarehouseModel.schema.path("address")).toBeDefined();
    expect(WarehouseModel.schema.path("managerId")).toBeDefined();
    expect(WarehouseModel.schema.path("isDeleted")).toBeDefined();
    expect(WarehouseZoneModel.schema.path("warehouseId")).toBeDefined();
    expect(WarehouseZoneModel.schema.path("code")).toBeDefined();
    expect(WarehouseZoneModel.schema.path("isDeleted")).toBeDefined();
  });

  it("accepts a complete warehouse and defaults its type", () => {
    const result = warehouseCreateValidation.parse({
      body: {
        name: "Central Store",
        code: "CENTRAL-1",
        address: {
          line1: "12 Market Road",
          city: "Chennai",
          state: "Tamil Nadu",
          pincode: "600001",
        },
        contactPhone: "+91 98765 43210",
      },
    });

    expect(result.body.type).toBe(WarehouseType.SECONDARY);
  });

  it("coerces list pagination and filters", () => {
    const result = warehouseListValidation.parse({
      query: {
        page: "2",
        limit: "10",
        isActive: "true",
        type: WarehouseType.MAIN,
      },
    });

    expect(result.query).toMatchObject({
      page: 2,
      limit: 10,
      isActive: true,
      type: WarehouseType.MAIN,
      sortOrder: "desc",
    });
  });

  it("rejects empty warehouse and zone updates", () => {
    expect(
      warehouseUpdateValidation.safeParse({
        params: { id: objectId },
        query: {},
        body: {},
      }).success,
    ).toBe(false);
    expect(
      warehouseZoneUpdateValidation.safeParse({
        params: { id: objectId, zoneId: otherObjectId },
        query: {},
        body: {},
      }).success,
    ).toBe(false);
  });

  it("validates movement filters and chronological date ranges", () => {
    expect(
      warehouseMovementValidation.safeParse({
        params: { id: objectId },
        query: {
          type: StockMovementType.INFLOW,
          from: "2026-06-01",
          to: "2026-06-15",
        },
      }).success,
    ).toBe(true);
    expect(
      warehouseMovementValidation.safeParse({
        params: { id: objectId },
        query: {
          from: "2026-06-15",
          to: "2026-06-01",
        },
      }).success,
    ).toBe(false);
  });

  it("enforces assigned warehouse scope for operational roles", () => {
    const storeManager = actor(Role.STORE_MANAGER, [objectId]);
    const subAdmin = actor(Role.SUB_ADMIN, [objectId]);
    const admin = actor(Role.ADMIN);
    const viewer = actor(Role.VIEWER);

    expect(canReadWarehouse(storeManager, objectId)).toBe(true);
    expect(canReadWarehouse(storeManager, otherObjectId)).toBe(false);
    expect(canManageWarehouse(subAdmin, otherObjectId)).toBe(false);
    expect(canManageWarehouse(admin, otherObjectId)).toBe(true);
    expect(canReadWarehouse(viewer, otherObjectId)).toBe(true);
    expect(canManageWarehouse(viewer, otherObjectId)).toBe(false);
  });
});
