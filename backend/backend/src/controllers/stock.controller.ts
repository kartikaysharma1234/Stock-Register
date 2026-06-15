import { Request, Response } from "express";
import { MovementListFilter } from "../repository/inventory.repository";
import {
  ReconciliationLineInput,
  StockTransferInput,
  inventoryService,
} from "../services/inventory.service";
import { sendSuccess } from "../utils/api-response";
import {
  actorFrom,
  validatedBody,
  validatedQuery,
} from "./controller.utils";

interface MovementQuery extends MovementListFilter {
  organizationId?: string;
}

export const stockController = {
  async transfer(req: Request, res: Response) {
    return sendSuccess(
      res,
      "Stock transferred successfully",
      await inventoryService.transferStock(
        actorFrom(req),
        validatedBody<StockTransferInput>(req),
      ),
      201,
    );
  },

  async movements(req: Request, res: Response) {
    const { organizationId, ...filter } =
      validatedQuery<MovementQuery>(req);
    const page = await inventoryService.listMovementsPage(
      actorFrom(req),
      organizationId,
      filter,
    );
    return sendSuccess(
      res,
      "Stock movements retrieved successfully",
      page.movements,
      200,
      page.pagination,
    );
  },

  async reconcile(req: Request, res: Response) {
    const body = validatedBody<{
      organizationId?: string;
      warehouseId: string;
      lines: ReconciliationLineInput[];
      notes?: string;
    }>(req);
    return sendSuccess(
      res,
      "Stock reconciled successfully",
      await inventoryService.reconcileStock(
        actorFrom(req),
        body.warehouseId,
        body.lines,
        body.notes,
        body.organizationId,
      ),
    );
  },
};
