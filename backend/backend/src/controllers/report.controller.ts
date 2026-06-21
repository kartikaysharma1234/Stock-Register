import { Request, Response } from "express";
import { ReportFormat, ReportKind } from "../constants";
import {
  ReportRangeFilter,
  SavedReportListFilter,
  StockStatusFilter,
} from "../repository/report.repository";
import { SavedReportInput, reportService } from "../services/report.service";
import { sendSuccess } from "../utils/api-response";
import {
  actorFrom,
  validatedBody,
  validatedParams,
  validatedQuery,
} from "./controller.utils";

type DateRangeQuery = ReportRangeFilter & {
  from: Date;
  to: Date;
};

export const reportController = {
  async dashboard(req: Request, res: Response) {
    const query = validatedQuery<DateRangeQuery>(req);
    return sendSuccess(
      res,
      "Report dashboard fetched successfully",
      await reportService.dashboard(actorFrom(req), query.from, query.to),
    );
  },

  async stockMovements(req: Request, res: Response) {
    const query = validatedQuery<DateRangeQuery>(req);
    return sendSuccess(
      res,
      "Stock movement report fetched successfully",
      await reportService.stockMovements(
        actorFrom(req),
        query.from,
        query.to,
        query,
      ),
    );
  },

  async departmentConsumption(req: Request, res: Response) {
    const query = validatedQuery<DateRangeQuery>(req);
    return sendSuccess(
      res,
      "Department consumption report fetched successfully",
      await reportService.departmentConsumption(
        actorFrom(req),
        query.from,
        query.to,
        query,
      ),
    );
  },

  async stockStatus(req: Request, res: Response) {
    return sendSuccess(
      res,
      "Stock status report fetched successfully",
      await reportService.stockStatus(
        actorFrom(req),
        validatedQuery<StockStatusFilter>(req),
      ),
    );
  },

  async lowStock(req: Request, res: Response) {
    return sendSuccess(
      res,
      "Low stock report fetched successfully",
      await reportService.lowStock(
        actorFrom(req),
        validatedQuery<ReportRangeFilter>(req),
      ),
    );
  },

  async outOfStock(req: Request, res: Response) {
    return sendSuccess(
      res,
      "Out of stock report fetched successfully",
      await reportService.outOfStock(
        actorFrom(req),
        validatedQuery<ReportRangeFilter>(req),
      ),
    );
  },

  async inventoryValuation(req: Request, res: Response) {
    return sendSuccess(
      res,
      "Inventory valuation report fetched successfully",
      await reportService.inventoryValuation(
        actorFrom(req),
        validatedQuery<ReportRangeFilter>(req),
      ),
    );
  },

  async topConsumption(req: Request, res: Response) {
    const query = validatedQuery<DateRangeQuery>(req);
    return sendSuccess(
      res,
      "Top consumption report fetched successfully",
      await reportService.topConsumption(
        actorFrom(req),
        query.from,
        query.to,
        query,
      ),
    );
  },

  async export(req: Request, res: Response) {
    const body = validatedBody<{
      recipientEmail: string;
      kind: ReportKind;
      format: ReportFormat;
      filters: Record<string, unknown>;
    }>(req);
    return sendSuccess(
      res,
      "Report export queued successfully",
      await reportService.export(
        actorFrom(req),
        body.recipientEmail,
        body.kind,
        body.format,
        body.filters,
      ),
      202,
    );
  },

  async createSaved(req: Request, res: Response) {
    return sendSuccess(
      res,
      "Saved report created successfully",
      await reportService.createSaved(
        actorFrom(req),
        validatedBody<SavedReportInput>(req),
      ),
      201,
    );
  },

  async listSaved(req: Request, res: Response) {
    const result = await reportService.listSaved(
      actorFrom(req),
      validatedQuery<SavedReportListFilter>(req),
    );
    return sendSuccess(
      res,
      "Saved reports fetched successfully",
      result.reports,
      200,
      result.pagination,
    );
  },

  async getSaved(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    return sendSuccess(
      res,
      "Saved report fetched successfully",
      await reportService.getSaved(actorFrom(req), id),
    );
  },

  async updateSaved(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    return sendSuccess(
      res,
      "Saved report updated successfully",
      await reportService.updateSaved(
        actorFrom(req),
        id,
        validatedBody<Partial<SavedReportInput>>(req),
      ),
    );
  },

  async removeSaved(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    await reportService.removeSaved(actorFrom(req), id);
    return sendSuccess(res, "Saved report deleted successfully", null);
  },

  async runSaved(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    return sendSuccess(
      res,
      "Saved report run queued successfully",
      await reportService.runSaved(actorFrom(req), id),
      202,
    );
  },
};
