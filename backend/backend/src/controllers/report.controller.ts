import { Request, Response } from "express";
import { reportService } from "../services/report.service";
import {
  actorFrom,
  validatedBody,
  validatedQuery,
} from "./controller.utils";

export const reportController = {
  async stockMovements(req: Request, res: Response) {
    const query = validatedQuery<{
      from: Date;
      to: Date;
      warehouseId?: string;
    }>(req);
    res.json(
      await reportService.stockMovements(
        actorFrom(req),
        query.from,
        query.to,
        query.warehouseId,
      ),
    );
  },
  async departmentConsumption(req: Request, res: Response) {
    const query = validatedQuery<{ from: Date; to: Date }>(req);
    res.json(
      await reportService.departmentConsumption(
        actorFrom(req),
        query.from,
        query.to,
      ),
    );
  },
  async stockStatus(req: Request, res: Response) {
    res.json(await reportService.stockStatus(actorFrom(req)));
  },
  async export(req: Request, res: Response) {
    const body = validatedBody<{
      recipientEmail: string;
      kind: "stock-movement" | "department-consumption" | "stock-status";
      format: "xlsx" | "pdf";
      filters: { from?: string; to?: string; warehouseId?: string };
    }>(req);
    res.status(202).json(
      await reportService.export(
        actorFrom(req),
        body.recipientEmail,
        body.kind,
        body.format,
        body.filters,
      ),
    );
  },
};
