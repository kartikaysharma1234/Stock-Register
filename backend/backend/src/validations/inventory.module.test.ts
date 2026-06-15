import {
  ItemUnit,
  StockMovementType,
  ValuationMethod,
} from "../constants";
import {
  CategoryModel,
  InventoryBalanceModel,
  ItemModel,
  StockBatchModel,
  StockMovementModel,
} from "../repository/schemas";
import {
  createItemValidation,
  batchListValidation,
  itemListValidation,
  movementListValidation,
  stockChangeValidation,
  stockReconciliationValidation,
  stockTransferValidation,
} from "./inventory.validation";

const organizationId = "507f1f77bcf86cd799439011";
const itemId = "507f191e810c19729de860ea";
const warehouseId = "507f191e810c19729de860eb";
const otherWarehouseId = "507f191e810c19729de860ec";

const validItem = {
  organizationId,
  name: "Industrial Gloves",
  sku: "GLOVE-001",
  categoryId: itemId,
  unit: ItemUnit.PCS,
};

describe("Module 4 inventory management", () => {
  it("defines advanced inventory persistence fields", () => {
    expect(CategoryModel.schema.path("parentCategoryId")).toBeDefined();
    expect(CategoryModel.schema.path("isDeleted")).toBeDefined();
    expect(ItemModel.schema.path("variants")).toBeDefined();
    expect(ItemModel.schema.path("bundleComponents")).toBeDefined();
    expect(ItemModel.schema.path("valuationMethod")).toBeDefined();
    expect(ItemModel.schema.path("isAsset")).toBeDefined();
    expect(InventoryBalanceModel.schema.path("zoneId")).toBeDefined();
    expect(InventoryBalanceModel.schema.path("availableQuantity")).toBeDefined();
    expect(InventoryBalanceModel.schema.path("averageCost")).toBeDefined();
    expect(StockBatchModel.schema.path("remainingQuantity")).toBeDefined();
    expect(StockBatchModel.schema.path("serialNumbers")).toBeDefined();
    expect(StockMovementModel.schema.path("costPerUnit")).toBeDefined();
    expect(StockMovementModel.schema.path("referenceType")).toBeDefined();
    expect(
      StockBatchModel.schema
        .indexes()
        .some(
          ([keys, options]) =>
            keys.organizationId === 1 &&
            keys.serialNumbers === 1 &&
            options.unique === true,
        ),
    ).toBe(true);
  });

  it("applies production defaults when creating an item", () => {
    const result = createItemValidation.parse({ body: validItem });

    expect(result.body).toMatchObject({
      valuationMethod: ValuationMethod.WEIGHTED_AVERAGE,
      variants: [],
      bundleComponents: [],
      minStockThreshold: 0,
      reorderPoint: 0,
      reorderQuantity: 0,
      gstRate: 0,
      isAsset: false,
      trackBatches: false,
      trackExpiry: false,
      isActive: true,
    });
  });

  it("rejects invalid thresholds and duplicate variants", () => {
    const result = createItemValidation.safeParse({
      body: {
        ...validItem,
        minStockThreshold: 20,
        maxStockThreshold: 10,
        variants: [
          { name: "Small", sku: "GLOVE-S" },
          { name: "Small duplicate", sku: "glove-s" },
        ],
      },
    });

    expect(result.success).toBe(false);
  });

  it("requires batch tracking when expiry tracking is enabled", () => {
    expect(
      createItemValidation.safeParse({
        body: {
          ...validItem,
          trackBatches: false,
          trackExpiry: true,
        },
      }).success,
    ).toBe(false);
  });

  it("coerces searchable item pagination and filters", () => {
    const result = itemListValidation.parse({
      query: {
        organizationId,
        page: "2",
        limit: "25",
        isAsset: "true",
        unit: ItemUnit.PCS,
      },
    });

    expect(result.query).toMatchObject({
      page: 2,
      limit: 25,
      isAsset: true,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  });

  it("rejects transfers that do not change location", () => {
    expect(
      stockTransferValidation.safeParse({
        body: {
          organizationId,
          itemId,
          sourceWarehouseId: warehouseId,
          destinationWarehouseId: warehouseId,
          quantity: 5,
        },
      }).success,
    ).toBe(false);
    expect(
      stockTransferValidation.safeParse({
        body: {
          organizationId,
          itemId,
          sourceWarehouseId: warehouseId,
          destinationWarehouseId: otherWarehouseId,
          quantity: 5,
        },
      }).success,
    ).toBe(true);
  });

  it("rejects duplicate item and zone reconciliation lines", () => {
    expect(
      stockReconciliationValidation.safeParse({
        body: {
          organizationId,
          warehouseId,
          lines: [
            { itemId, countedQuantity: 10 },
            { itemId, countedQuantity: 12 },
          ],
        },
      }).success,
    ).toBe(false);
  });

  it("validates unique serial numbers and zone batch filters", () => {
    expect(
      stockChangeValidation.safeParse({
        body: {
          organizationId,
          itemId,
          warehouseId,
          quantity: 2,
          batchNumber: "BATCH-1",
          serialNumbers: ["SERIAL-1", "SERIAL-1"],
        },
      }).success,
    ).toBe(false);

    const result = batchListValidation.parse({
      params: { id: itemId },
      query: {
        organizationId,
        warehouseId,
        zoneId: otherWarehouseId,
      },
    });
    expect(result.query.zoneId).toBe(otherWarehouseId);
  });

  it("validates stock movement filters and date order", () => {
    expect(
      movementListValidation.safeParse({
        query: {
          organizationId,
          type: StockMovementType.OUTFLOW,
          from: "2026-06-01",
          to: "2026-06-15",
        },
      }).success,
    ).toBe(true);
    expect(
      movementListValidation.safeParse({
        query: {
          organizationId,
          from: "2026-06-15",
          to: "2026-06-01",
        },
      }).success,
    ).toBe(false);
  });
});
