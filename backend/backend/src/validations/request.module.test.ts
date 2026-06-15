import {
  BudgetPeriod,
  CounterType,
  Permission,
  RequestPriority,
  RequestStatus,
  ROLE_PERMISSIONS,
  Role,
} from "../constants";
import { formatCounterNumber } from "../repository/counter.repository";
import {
  CounterModel,
  DepartmentModel,
  StockRequestModel,
} from "../repository/schemas";
import {
  departmentCreateValidation,
  departmentListValidation,
} from "./department.validation";
import {
  approveRequestValidation,
  createRequestValidation,
  fulfillRequestValidation,
  requestListValidation,
  updateRequestValidation,
} from "./request.validation";

const organizationId = "507f1f77bcf86cd799439011";
const departmentId = "507f191e810c19729de860ea";
const warehouseId = "507f191e810c19729de860eb";
const itemId = "507f191e810c19729de860ec";

describe("Module 5 department and request workflow", () => {
  it("defines department budget, ownership, and soft-delete fields", () => {
    expect(DepartmentModel.schema.path("headUserId")).toBeDefined();
    expect(DepartmentModel.schema.virtualpath("headId")).toBeDefined();
    expect(DepartmentModel.schema.path("budgetAllocated")).toBeDefined();
    expect(DepartmentModel.schema.path("budgetCommitted")).toBeDefined();
    expect(DepartmentModel.schema.path("budgetUsed")).toBeDefined();
    expect(DepartmentModel.schema.path("budgetPeriod")).toBeDefined();
    expect(DepartmentModel.schema.path("isDeleted")).toBeDefined();
  });

  it("defines request approval, fulfillment, and reservation fields", () => {
    expect(StockRequestModel.schema.virtualpath("items")).toBeDefined();
    expect(
      StockRequestModel.schema.path("lines.approvedQuantity"),
    ).toBeDefined();
    expect(
      StockRequestModel.schema.path("lines.fulfilledQuantity"),
    ).toBeDefined();
    expect(StockRequestModel.schema.path("priority")).toBeDefined();
    expect(StockRequestModel.schema.path("approvalHistory")).toBeDefined();
    expect(StockRequestModel.schema.path("stockReserved")).toBeDefined();
    expect(
      StockRequestModel.schema.path("budgetCommittedAmount"),
    ).toBeDefined();
    expect(StockRequestModel.schema.path("isDeleted")).toBeDefined();
    expect(StockRequestModel.schema.path("status").options.default).toBe(
      RequestStatus.DRAFT,
    );
  });

  it("defines tenant-scoped yearly counters and request formatting", () => {
    expect(CounterModel.schema.path("organizationId")).toBeDefined();
    expect(CounterModel.schema.path("type")).toBeDefined();
    expect(CounterModel.schema.path("year")).toBeDefined();
    expect(CounterModel.schema.path("sequence")).toBeDefined();
    expect(
      formatCounterNumber(CounterType.STOCK_REQUEST, 2026, 7),
    ).toBe("REQ-2026-0007");
  });

  it("accepts canonical request items", () => {
    const result = createRequestValidation.parse({
      body: {
        organizationId,
        departmentId,
        warehouseId,
        priority: RequestPriority.URGENT,
        items: [{ itemId, quantity: "5" }],
      },
    });

    expect(result.body.items).toEqual([{ itemId, quantity: 5 }]);
    expect(result.body.priority).toBe(RequestPriority.URGENT);
  });

  it("normalizes legacy request lines", () => {
    const result = createRequestValidation.parse({
      body: {
        organizationId,
        departmentId,
        warehouseId,
        purpose: "Monthly stationery",
        lines: [{ itemId, requestedQuantity: "3" }],
      },
    });

    expect(result.body.items).toEqual([{ itemId, quantity: 3 }]);
    expect(result.body.notes).toBe("Monthly stationery");
  });

  it("rejects ambiguous and empty draft updates", () => {
    expect(
      createRequestValidation.safeParse({
        body: {
          departmentId,
          warehouseId,
          items: [{ itemId, quantity: 1 }],
          lines: [{ itemId, requestedQuantity: 1 }],
        },
      }).success,
    ).toBe(false);
    expect(
      updateRequestValidation.safeParse({
        params: { id: itemId },
        query: {},
        body: {},
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate approval and fulfillment selectors", () => {
    expect(
      approveRequestValidation.safeParse({
        params: { id: itemId },
        query: {},
        body: {
          items: [
            { itemId, approvedQuantity: 2 },
            { itemId, approvedQuantity: 1 },
          ],
        },
      }).success,
    ).toBe(false);
    expect(
      fulfillRequestValidation.safeParse({
        params: { id: itemId },
        query: {},
        body: {
          items: [
            { itemId, quantity: 1 },
            { itemId, quantity: 1 },
          ],
        },
      }).success,
    ).toBe(false);
  });

  it("coerces request and department list filters", () => {
    const requests = requestListValidation.parse({
      query: {
        page: "2",
        limit: "10",
        status: RequestStatus.PENDING,
        priority: RequestPriority.HIGH,
      },
    });
    const departments = departmentListValidation.parse({
      query: {
        page: "3",
        limit: "15",
        isActive: "true",
        budgetPeriod: BudgetPeriod.MONTHLY,
      },
    });

    expect(requests.query).toMatchObject({
      page: 2,
      limit: 10,
      status: RequestStatus.PENDING,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    expect(departments.query).toMatchObject({
      page: 3,
      limit: 15,
      isActive: true,
      budgetPeriod: BudgetPeriod.MONTHLY,
    });
  });

  it("validates department budget input and workflow permissions", () => {
    expect(
      departmentCreateValidation.safeParse({
        body: {
          organizationId,
          name: "Operations",
          code: "OPS",
          budgetAllocated: -1,
        },
      }).success,
    ).toBe(false);

    expect(ROLE_PERMISSIONS[Role.DEPARTMENT_HEAD]).toEqual(
      expect.arrayContaining([
        Permission.REQUEST_CREATE,
        Permission.REQUEST_APPROVE,
        Permission.REQUEST_REJECT,
        Permission.REQUEST_CANCEL,
      ]),
    );
    expect(ROLE_PERMISSIONS[Role.STORE_MANAGER]).toEqual(
      expect.arrayContaining([
        Permission.REQUEST_APPROVE,
        Permission.REQUEST_REJECT,
        Permission.REQUEST_FULFILL,
      ]),
    );
  });
});
