jest.mock("bull", () => {
  const Queue = jest.fn().mockImplementation((name: string) => ({
    name,
    add: jest.fn().mockResolvedValue({ id: `${name}-job` }),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    process: jest.fn(),
  }));
  return { __esModule: true, default: Queue };
});

import {
  Permission,
  ReportFormat,
  ReportFrequency,
  ReportKind,
  ROLE_PERMISSIONS,
  Role,
  SortOrder,
} from "../constants";
import { reportQueue } from "../queue/report.queue";
import { SavedReportModel } from "../repository/schemas";
import { nextScheduleTime } from "../services/report.service";
import {
  createSavedReportValidation,
  dateRangeValidation,
  exportReportValidation,
  savedReportListValidation,
  stockStatusReportValidation,
  updateSavedReportValidation,
} from "./report.validation";

const organizationId = "507f1f77bcf86cd799439011";
const warehouseId = "507f191e810c19729de860ea";
const reportId = "507f191e810c19729de860eb";

describe("Module 10 reporting and analytics", () => {
  it("defines saved report persistence fields", () => {
    expect(SavedReportModel.schema.path("organizationId")).toBeDefined();
    expect(SavedReportModel.schema.path("name")).toBeDefined();
    expect(SavedReportModel.schema.path("kind")).toBeDefined();
    expect(SavedReportModel.schema.path("filters")).toBeDefined();
    expect(SavedReportModel.schema.path("format")).toBeDefined();
    expect(SavedReportModel.schema.path("frequency")).toBeDefined();
    expect(SavedReportModel.schema.path("recipients")).toBeDefined();
    expect(SavedReportModel.schema.path("nextRunAt")).toBeDefined();
    expect(SavedReportModel.schema.path("lastRunAt")).toBeDefined();
    expect(SavedReportModel.schema.path("lastJobId")).toBeDefined();
    expect(SavedReportModel.schema.path("isDeleted")).toBeDefined();
  });

  it("defines report kinds, formats, frequencies, and queue name", () => {
    expect(Object.values(ReportKind)).toEqual(
      expect.arrayContaining([
        ReportKind.STOCK_MOVEMENT,
        ReportKind.DEPARTMENT_CONSUMPTION,
        ReportKind.STOCK_STATUS,
        ReportKind.LOW_STOCK,
        ReportKind.OUT_OF_STOCK,
        ReportKind.INVENTORY_VALUATION,
        ReportKind.TOP_CONSUMPTION,
      ]),
    );
    expect(Object.values(ReportFormat)).toEqual(
      expect.arrayContaining([ReportFormat.XLSX, ReportFormat.PDF]),
    );
    expect(Object.values(ReportFrequency)).toEqual(
      expect.arrayContaining([
        ReportFrequency.NONE,
        ReportFrequency.DAILY,
        ReportFrequency.WEEKLY,
        ReportFrequency.MONTHLY,
      ]),
    );
    expect(reportQueue.name).toBe("inventory-reports");
  });

  it("validates report date ranges and stock status filters", () => {
    const result = dateRangeValidation.parse({
      query: {
        from: "2026-06-01",
        to: "2026-06-30",
        warehouseId,
        limit: "15",
      },
    });
    const stockStatus = stockStatusReportValidation.parse({
      query: {
        warehouseId,
        status: "low_stock",
      },
    });

    expect(result.query.limit).toBe(15);
    expect(result.query.from).toBeInstanceOf(Date);
    expect(stockStatus.query.status).toBe("low_stock");
    expect(
      dateRangeValidation.safeParse({
        query: {
          from: "2026-07-01",
          to: "2026-06-01",
        },
      }).success,
    ).toBe(false);
  });

  it("normalizes export and saved report payloads", () => {
    const exported = exportReportValidation.parse({
      body: {
        recipientEmail: "ops@example.com",
        kind: "STOCK_MOVEMENT",
        format: "PDF",
        filters: {
          from: "2026-06-01",
          to: "2026-06-30",
          warehouseId,
        },
      },
    });
    const saved = createSavedReportValidation.parse({
      body: {
        name: "Weekly low stock",
        kind: "LOW_STOCK",
        frequency: "WEEKLY",
        recipients: ["OPS@example.com"],
      },
    });

    expect(exported.body).toMatchObject({
      kind: ReportKind.STOCK_MOVEMENT,
      format: ReportFormat.PDF,
    });
    expect(saved.body).toMatchObject({
      kind: ReportKind.LOW_STOCK,
      frequency: ReportFrequency.WEEKLY,
      format: ReportFormat.XLSX,
    });
  });

  it("rejects invalid saved report scheduling and empty updates", () => {
    expect(
      createSavedReportValidation.safeParse({
        body: {
          name: "Daily valuation",
          kind: ReportKind.INVENTORY_VALUATION,
          frequency: ReportFrequency.DAILY,
        },
      }).success,
    ).toBe(false);
    expect(
      updateSavedReportValidation.safeParse({
        params: { id: reportId },
        body: {},
      }).success,
    ).toBe(false);
  });

  it("validates saved report listing and computes next schedule dates", () => {
    const listed = savedReportListValidation.parse({
      query: {
        organizationId,
        page: "2",
        limit: "10",
        frequency: "MONTHLY",
        isActive: "true",
        sortOrder: "ASC",
      },
    });
    const nextDaily = nextScheduleTime(
      ReportFrequency.DAILY,
      new Date("2026-06-20T00:00:00.000Z"),
    );

    expect(listed.query).toMatchObject({
      page: 2,
      limit: 10,
      frequency: ReportFrequency.MONTHLY,
      isActive: true,
      sortOrder: SortOrder.ASC,
    });
    expect(nextDaily?.toISOString()).toBe("2026-06-21T00:00:00.000Z");
  });

  it("maps reporting permissions to analytics roles", () => {
    expect(ROLE_PERMISSIONS[Role.ADMIN]).toEqual(
      expect.arrayContaining([
        Permission.REPORT_READ,
        Permission.REPORT_EXPORT,
        Permission.REPORT_SAVE,
        Permission.REPORT_SCHEDULE,
      ]),
    );
    expect(ROLE_PERMISSIONS[Role.STORE_MANAGER]).toEqual(
      expect.arrayContaining([
        Permission.REPORT_READ,
        Permission.REPORT_EXPORT,
      ]),
    );
    expect(ROLE_PERMISSIONS[Role.VIEWER]).toEqual(
      expect.arrayContaining([Permission.REPORT_READ]),
    );
    expect(ROLE_PERMISSIONS[Role.VIEWER]).not.toContain(
      Permission.REPORT_EXPORT,
    );
  });
});
