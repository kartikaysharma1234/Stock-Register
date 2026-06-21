import {
  Permission,
  ReportFormat,
  ReportFrequency,
  ReportKind,
} from "../constants";
import { reportQueue } from "../queue/report.queue";
import {
  ReportRangeFilter,
  SavedReportListFilter,
  StockStatusFilter,
  reportRepository,
} from "../repository/report.repository";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";

export interface SavedReportInput {
  name: string;
  description?: string;
  kind: ReportKind;
  filters?: Record<string, unknown>;
  columns?: string[];
  format?: ReportFormat;
  frequency?: ReportFrequency;
  recipients?: string[];
  nextRunAt?: Date;
  isActive?: boolean;
}

const uniqueEmails = (emails: string[] = []) =>
  [...new Set(emails.map((email) => email.toLowerCase()))];

const nextScheduleTime = (
  frequency: ReportFrequency,
  base = new Date(),
) => {
  const next = new Date(base);
  switch (frequency) {
    case ReportFrequency.DAILY:
      next.setUTCDate(next.getUTCDate() + 1);
      break;
    case ReportFrequency.WEEKLY:
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case ReportFrequency.MONTHLY:
      next.setUTCMonth(next.getUTCMonth() + 1);
      break;
    case ReportFrequency.NONE:
      return undefined;
  }
  return next;
};

const filterString = (filters: Record<string, unknown>, key: string) => {
  const value = filters[key];
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : undefined;
};

const filterNumber = (filters: Record<string, unknown>, key: string) => {
  const value = filters[key];
  return typeof value === "number" ? value : undefined;
};

const queueFilters = (filters: Record<string, unknown> = {}) => ({
  from: filterString(filters, "from"),
  to: filterString(filters, "to"),
  warehouseId: filterString(filters, "warehouseId"),
  departmentId: filterString(filters, "departmentId"),
  itemId: filterString(filters, "itemId"),
  categoryId: filterString(filters, "categoryId"),
  limit: filterNumber(filters, "limit"),
});

export class ReportService {
  private organizationId(actor: AuthUser) {
    if (!actor.organizationId) {
      throw new ApiError(400, "Organization is required");
    }
    return actor.organizationId;
  }

  private assertSchedulePermission(actor: AuthUser, frequency?: ReportFrequency) {
    if (
      frequency &&
      frequency !== ReportFrequency.NONE &&
      !actor.permissions.includes(Permission.REPORT_SCHEDULE)
    ) {
      throw new ApiError(403, "Scheduling reports requires report schedule permission");
    }
  }

  private assertScheduledRecipients(
    frequency: ReportFrequency,
    recipients: string[],
  ) {
    if (frequency !== ReportFrequency.NONE && recipients.length === 0) {
      throw new ApiError(422, "Scheduled reports require at least one recipient");
    }
  }

  stockMovements(
    actor: AuthUser,
    from: Date,
    to: Date,
    filter: ReportRangeFilter = {},
  ) {
    return reportRepository.stockMovementSummary(
      this.organizationId(actor),
      from,
      to,
      filter,
    );
  }

  departmentConsumption(
    actor: AuthUser,
    from: Date,
    to: Date,
    filter: ReportRangeFilter = {},
  ) {
    return reportRepository.departmentConsumption(
      this.organizationId(actor),
      from,
      to,
      filter,
    );
  }

  stockStatus(actor: AuthUser, filter: StockStatusFilter = {}) {
    return reportRepository.stockStatus(this.organizationId(actor), filter);
  }

  lowStock(actor: AuthUser, filter: ReportRangeFilter = {}) {
    return reportRepository.lowStock(this.organizationId(actor), filter);
  }

  outOfStock(actor: AuthUser, filter: ReportRangeFilter = {}) {
    return reportRepository.outOfStock(this.organizationId(actor), filter);
  }

  inventoryValuation(actor: AuthUser, filter: ReportRangeFilter = {}) {
    return reportRepository.inventoryValuation(
      this.organizationId(actor),
      filter,
    );
  }

  topConsumption(
    actor: AuthUser,
    from: Date,
    to: Date,
    filter: ReportRangeFilter = {},
  ) {
    return reportRepository.topConsumption(
      this.organizationId(actor),
      from,
      to,
      filter,
    );
  }

  dashboard(actor: AuthUser, from: Date, to: Date) {
    return reportRepository.dashboardSummary(
      this.organizationId(actor),
      from,
      to,
    );
  }

  async export(
    actor: AuthUser,
    recipientEmail: string,
    kind: ReportKind,
    format: ReportFormat,
    filters: Record<string, unknown>,
  ) {
    const job = await reportQueue.add({
      organizationId: this.organizationId(actor),
      requestedBy: actor.id,
      recipientEmail,
      recipients: [recipientEmail],
      kind,
      format,
      filters: queueFilters(filters),
    });
    return { jobId: job.id, status: "queued" };
  }

  async createSaved(actor: AuthUser, data: SavedReportInput) {
    const organizationId = this.organizationId(actor);
    const frequency = data.frequency ?? ReportFrequency.NONE;
    const recipients = uniqueEmails(data.recipients);
    this.assertSchedulePermission(actor, frequency);
    this.assertScheduledRecipients(frequency, recipients);

    return reportRepository.createSavedReport({
      organizationId,
      name: data.name,
      description: data.description,
      kind: data.kind,
      filters: data.filters ?? {},
      columns: data.columns ?? [],
      format: data.format ?? ReportFormat.XLSX,
      frequency,
      recipients,
      nextRunAt:
        frequency === ReportFrequency.NONE
          ? undefined
          : data.nextRunAt ?? nextScheduleTime(frequency),
      isActive: data.isActive ?? true,
      createdBy: actor.id,
    });
  }

  listSaved(actor: AuthUser, filter: SavedReportListFilter = {}) {
    return reportRepository.listSavedReports(
      this.organizationId(actor),
      filter,
    );
  }

  async getSaved(actor: AuthUser, id: string) {
    const report = await reportRepository.findSavedReport(
      this.organizationId(actor),
      id,
    );
    if (!report) throw new ApiError(404, "Saved report not found");
    return report;
  }

  async updateSaved(actor: AuthUser, id: string, data: Partial<SavedReportInput>) {
    const organizationId = this.organizationId(actor);
    const before = await reportRepository.findSavedReport(organizationId, id);
    if (!before) throw new ApiError(404, "Saved report not found");

    const frequency = data.frequency ?? before.frequency;
    const recipients =
      data.recipients !== undefined
        ? uniqueEmails(data.recipients)
        : before.recipients;
    this.assertSchedulePermission(actor, frequency);
    this.assertScheduledRecipients(frequency, recipients);

    const update: Record<string, unknown> = {
      ...data,
      recipients,
      updatedBy: actor.id,
    };
    if (data.frequency !== undefined) {
      if (data.frequency === ReportFrequency.NONE) {
        update.$unset = { nextRunAt: 1 };
      } else {
        update.nextRunAt =
          data.nextRunAt ?? before.nextRunAt ?? nextScheduleTime(data.frequency);
      }
    }

    const report = await reportRepository.updateSavedReport(
      organizationId,
      id,
      update,
    );
    if (!report) throw new ApiError(404, "Saved report not found");
    return report;
  }

  async removeSaved(actor: AuthUser, id: string) {
    const report = await reportRepository.softDeleteSavedReport(
      this.organizationId(actor),
      id,
      actor.id,
    );
    if (!report) throw new ApiError(404, "Saved report not found");
  }

  async runSaved(actor: AuthUser, id: string) {
    const report = await this.getSaved(actor, id);
    const recipients = uniqueEmails(report.recipients);
    const job = await reportQueue.add({
      organizationId: report.organizationId.toString(),
      requestedBy: actor.id,
      recipients,
      savedReportId: report.id,
      kind: report.kind,
      format: report.format,
      filters: queueFilters(report.filters),
    });
    return { jobId: job.id, status: "queued" };
  }
}

export const reportService = new ReportService();
export { nextScheduleTime };
