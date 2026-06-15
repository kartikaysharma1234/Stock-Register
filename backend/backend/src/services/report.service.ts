import { reportQueue, ReportKind } from "../queue/report.queue";
import { reportRepository } from "../repository/report.repository";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";

export class ReportService {
  private organizationId(actor: AuthUser) {
    if (!actor.organizationId) throw new ApiError(400, "Organization is required");
    return actor.organizationId;
  }

  stockMovements(
    actor: AuthUser,
    from: Date,
    to: Date,
    warehouseId?: string,
  ) {
    return reportRepository.stockMovementSummary(
      this.organizationId(actor),
      from,
      to,
      warehouseId,
    );
  }

  departmentConsumption(actor: AuthUser, from: Date, to: Date) {
    return reportRepository.departmentConsumption(
      this.organizationId(actor),
      from,
      to,
    );
  }

  stockStatus(actor: AuthUser) {
    return reportRepository.stockStatus(this.organizationId(actor));
  }

  async export(
    actor: AuthUser,
    recipientEmail: string,
    kind: ReportKind,
    format: "xlsx" | "pdf",
    filters: { from?: string; to?: string; warehouseId?: string },
  ) {
    const job = await reportQueue.add({
      organizationId: this.organizationId(actor),
      requestedBy: actor.id,
      recipientEmail,
      kind,
      format,
      filters,
    });
    return { jobId: job.id, status: "queued" };
  }
}

export const reportService = new ReportService();
