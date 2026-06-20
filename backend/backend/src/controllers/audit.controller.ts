import { Request, Response } from "express";
import { AuditListFilter } from "../repository/audit.repository";
import { AuditExportFormat, auditService } from "../services/audit.service";
import { sendSuccess } from "../utils/api-response";
import {
  actorFrom,
  validatedParams,
  validatedQuery,
} from "./controller.utils";

interface AuditQuery extends AuditListFilter {
  organizationId?: string;
}

interface AuditExportQuery extends AuditQuery {
  format: AuditExportFormat;
}

export const auditController = {
  async list(req: Request, res: Response) {
    const query = validatedQuery<AuditQuery>(req);
    const result = await auditService.listForActor(
      actorFrom(req),
      query.organizationId,
      query,
    );
    return sendSuccess(
      res,
      "Audit logs fetched successfully",
      result.logs,
      200,
      result.pagination,
    );
  },

  async export(req: Request, res: Response) {
    const query = validatedQuery<AuditExportQuery>(req);
    const result = await auditService.export(
      actorFrom(req),
      query.organizationId,
      query,
      query.format,
    );
    res.setHeader("Content-Type", result.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`,
    );
    return res.status(200).send(result.body);
  },

  async resourceHistory(req: Request, res: Response) {
    const { resourceId } = validatedParams<{ resourceId: string }>(req);
    const query = validatedQuery<AuditQuery>(req);
    const result = await auditService.resourceHistory(
      actorFrom(req),
      resourceId,
      query.organizationId,
      query,
    );
    return sendSuccess(
      res,
      "Audit resource history fetched successfully",
      result.logs,
      200,
      result.pagination,
    );
  },
};
