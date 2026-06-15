import { Request, Response } from "express";
import { inventoryService } from "../services/inventory.service";
import {
  actorFrom,
  validatedBody,
  validatedParams,
  validatedQuery,
} from "./controller.utils";

export const inventoryController = {
  async createItem(req: Request, res: Response) {
    res.status(201).json(
      await inventoryService.createItem(actorFrom(req), validatedBody(req)),
    );
  },
  async listItems(req: Request, res: Response) {
    const { organizationId, ...filter } = validatedQuery<{
      organizationId?: string;
      search?: string;
      categoryId?: string;
      isActive?: boolean;
    }>(req);
    res.json(
      await inventoryService.listItems(
        actorFrom(req),
        organizationId,
        filter,
      ),
    );
  },
  async updateItem(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    res.json(
      await inventoryService.updateItem(actorFrom(req), id, validatedBody(req)),
    );
  },
  async archiveItem(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } = validatedQuery<{
      organizationId?: string;
    }>(req);
    await inventoryService.archiveItem(actorFrom(req), id, organizationId);
    res.json(null);
  },
  async balances(req: Request, res: Response) {
    const { warehouseId } = validatedQuery<{ warehouseId?: string }>(req);
    res.json(await inventoryService.listBalances(actorFrom(req), warehouseId));
  },
  async lowStock(req: Request, res: Response) {
    const { warehouseId } = validatedQuery<{ warehouseId?: string }>(req);
    res.json(await inventoryService.listLowStock(actorFrom(req), warehouseId));
  },
  async stockIn(req: Request, res: Response) {
    res.status(201).json(
      await inventoryService.manualStockIn(actorFrom(req), validatedBody(req)),
    );
  },
  async stockOut(req: Request, res: Response) {
    res.status(201).json(
      await inventoryService.manualStockOut(actorFrom(req), validatedBody(req)),
    );
  },
  async movements(req: Request, res: Response) {
    res.json(
      await inventoryService.listMovements(actorFrom(req), validatedQuery(req)),
    );
  },
};
