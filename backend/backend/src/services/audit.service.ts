import ExcelJS from "exceljs";
import { AuditModule, Role } from "../constants";
import {
  AuditListFilter,
  auditRepository,
} from "../repository/audit.repository";
import { IAuditLog } from "../repository/schemas";
import { AuditContext, AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";

export type AuditExportFormat = "csv" | "xlsx";

export interface AuditRecordInput {
  action: string;
  module?: AuditModule;
  entityType?: string;
  resourceType?: string;
  entityId?: string;
  resourceId?: string;
  before?: unknown;
  previousValue?: unknown;
  after?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}

export interface AuditExportResult {
  filename: string;
  contentType: string;
  body: Buffer | string;
}

interface AuditExportRow {
  createdAt: string;
  module: string;
  action: string;
  resourceType: string;
  resourceId: string;
  performedBy: string;
  ipAddress: string;
  userAgent: string;
}

interface ActorSnapshot {
  _id?: unknown;
  name?: unknown;
  email?: unknown;
  role?: unknown;
}

export const inferAuditModule = (
  entityType: string | undefined,
  action = "",
): AuditModule => {
  const value = `${entityType ?? ""} ${action}`.toLowerCase();
  if (value.includes("asset")) return AuditModule.ASSET;
  if (
    value.includes("purchase") ||
    value.includes("vendor") ||
    value.includes("payment") ||
    value.includes("goodsreceived") ||
    value.includes("grn")
  ) {
    return AuditModule.PURCHASE;
  }
  if (value.includes("request") || value.includes("department")) {
    return AuditModule.REQUEST;
  }
  if (value.includes("user") || value.includes("role")) return AuditModule.USER;
  if (value.includes("billing") || value.includes("subscription") || value.includes("razorpay")) {
    return AuditModule.BILLING;
  }
  if (value.includes("auth") || value.includes("login") || value.includes("password") || value.includes("invite")) {
    return AuditModule.AUTH;
  }
  if (value.includes("organization") || value.includes("organisation")) {
    return AuditModule.ORGANIZATION;
  }
  if (value.includes("webhook")) return AuditModule.WEBHOOK;
  if (value.includes("apikey") || value.includes("api_key") || value.includes("api key")) {
    return AuditModule.API_KEY;
  }
  return AuditModule.INVENTORY;
};

const escapeCsv = (value: string) => {
  if (!/[",\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
};

const actorLabel = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const actor = value as ActorSnapshot;
    const email = typeof actor.email === "string" ? actor.email : undefined;
    const name = typeof actor.name === "string" ? actor.name : undefined;
    const id =
      actor._id && typeof actor._id === "object" && "toString" in actor._id
        ? actor._id.toString()
        : undefined;
    return [name, email].filter(Boolean).join(" <") + (name && email ? ">" : "") || id || "";
  }
  return String(value);
};

const idLabel = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "toString" in value) {
    return value.toString();
  }
  return String(value);
};

export class AuditService {
  private organizationId(actor: AuthUser, requestedOrganizationId?: string) {
    if (actor.role === Role.SUPER_ADMIN) return requestedOrganizationId;
    if (!actor.organizationId) {
      throw new ApiError(400, "Organization context is required");
    }
    if (
      requestedOrganizationId &&
      requestedOrganizationId !== actor.organizationId
    ) {
      throw new ApiError(403, "Organization context mismatch");
    }
    return actor.organizationId;
  }

  record(context: AuditContext, data: AuditRecordInput) {
    const entityType = data.entityType ?? data.resourceType ?? "Unknown";
    const entityId = data.entityId ?? data.resourceId;
    return auditRepository.create({
      organizationId: context.organizationId?.toString(),
      actorId: context.actorId?.toString(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      action: data.action,
      module: data.module ?? inferAuditModule(entityType, data.action),
      entityType,
      entityId,
      before: data.before ?? data.previousValue,
      after: data.after ?? data.newValue,
      metadata: data.metadata,
    });
  }

  listForActor(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    filter: AuditListFilter,
  ) {
    return auditRepository.list(
      this.organizationId(actor, requestedOrganizationId),
      filter,
    );
  }

  list(
    organizationId: string | undefined,
    filter: AuditListFilter,
  ) {
    return auditRepository.list(organizationId, filter);
  }

  resourceHistory(
    actor: AuthUser,
    resourceId: string,
    requestedOrganizationId: string | undefined,
    filter: AuditListFilter,
  ) {
    return auditRepository.resourceHistory(
      this.organizationId(actor, requestedOrganizationId),
      resourceId,
      filter,
    );
  }

  private toExportRow(log: IAuditLog): AuditExportRow {
    const document = log as IAuditLog & {
      get: (path: string) => unknown;
    };
    return {
      createdAt: log.createdAt.toISOString(),
      module: log.module,
      action: log.action,
      resourceType: log.entityType,
      resourceId: idLabel(log.entityId),
      performedBy: actorLabel(document.get("actorId")),
      ipAddress: log.ipAddress ?? "",
      userAgent: log.userAgent ?? "",
    };
  }

  private toCsv(rows: AuditExportRow[]) {
    const headers = [
      "createdAt",
      "module",
      "action",
      "resourceType",
      "resourceId",
      "performedBy",
      "ipAddress",
      "userAgent",
    ];
    return [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((key) => escapeCsv(row[key as keyof AuditExportRow]))
          .join(","),
      ),
    ].join("\n");
  }

  private async toXlsx(rows: AuditExportRow[]) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Audit Logs");
    worksheet.columns = [
      { header: "Created At", key: "createdAt", width: 26 },
      { header: "Module", key: "module", width: 18 },
      { header: "Action", key: "action", width: 28 },
      { header: "Resource Type", key: "resourceType", width: 22 },
      { header: "Resource ID", key: "resourceId", width: 28 },
      { header: "Performed By", key: "performedBy", width: 34 },
      { header: "IP Address", key: "ipAddress", width: 18 },
      { header: "User Agent", key: "userAgent", width: 60 },
    ];
    rows.forEach((row) => worksheet.addRow(row));
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async export(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    filter: AuditListFilter,
    format: AuditExportFormat,
  ): Promise<AuditExportResult> {
    const logs = await auditRepository.exportRows(
      this.organizationId(actor, requestedOrganizationId),
      filter,
    );
    const rows = logs.map((log) => this.toExportRow(log));
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    if (format === "xlsx") {
      return {
        filename: `audit-logs-${timestamp}.xlsx`,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        body: await this.toXlsx(rows),
      };
    }
    return {
      filename: `audit-logs-${timestamp}.csv`,
      contentType: "text/csv; charset=utf-8",
      body: this.toCsv(rows),
    };
  }
}

export const auditService = new AuditService();
