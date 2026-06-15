import { Request, Response } from "express";
import {
  BatchListFilter,
  ItemListFilter,
  MovementListFilter,
  StockListFilter,
} from "../repository/inventory.repository";
import {
  ItemInput,
  StockAdjustmentInput,
  inventoryService,
} from "../services/inventory.service";
import { sendSuccess } from "../utils/api-response";
import {
  actorFrom,
  validatedBody,
  validatedParams,
  validatedQuery,
} from "./controller.utils";

interface ItemListQuery extends ItemListFilter {
  organizationId?: string;
}

interface StockQuery extends StockListFilter {
  organizationId?: string;
}

interface BatchQuery extends BatchListFilter {
  organizationId?: string;
}

interface MovementQuery extends MovementListFilter {
  organizationId?: string;
}

const organizationIdFromQuery = (req: Request) =>
  validatedQuery<{ organizationId?: string }>(req).organizationId;

export const itemController = {
  async list(req: Request, res: Response) {
    const { organizationId, ...filter } = validatedQuery<ItemListQuery>(req);
    const result = await inventoryService.listItems(
      actorFrom(req),
      organizationId,
      filter,
    );
    return sendSuccess(
      res,
      "Items retrieved successfully",
      result.items,
      200,
      result.pagination,
    );
  },

  async create(req: Request, res: Response) {
    return sendSuccess(
      res,
      "Item created successfully",
      await inventoryService.createItem(
        actorFrom(req),
        validatedBody<ItemInput>(req),
      ),
      201,
    );
  },

  async get(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    return sendSuccess(
      res,
      "Item retrieved successfully",
      await inventoryService.getItem(
        actorFrom(req),
        id,
        organizationIdFromQuery(req),
      ),
    );
  },

  async update(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    return sendSuccess(
      res,
      "Item updated successfully",
      await inventoryService.updateItem(
        actorFrom(req),
        id,
        validatedBody<Partial<ItemInput>>(req),
        organizationIdFromQuery(req),
      ),
    );
  },

  async remove(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    await inventoryService.deleteItem(
      actorFrom(req),
      id,
      organizationIdFromQuery(req),
    );
    return sendSuccess(res, "Item deleted successfully", null);
  },

  async stock(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId, ...filter } = validatedQuery<StockQuery>(req);
    const result = await inventoryService.itemStock(
      actorFrom(req),
      id,
      organizationId,
      filter,
    );
    return sendSuccess(
      res,
      "Item stock retrieved successfully",
      result.stock,
      200,
      result.pagination,
    );
  },

  async movements(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId, ...filter } =
      validatedQuery<MovementQuery>(req);
    const result = await inventoryService.itemMovements(
      actorFrom(req),
      id,
      organizationId,
      filter,
    );
    return sendSuccess(
      res,
      "Item movements retrieved successfully",
      result.movements,
      200,
      result.pagination,
    );
  },

  async batches(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId, ...filter } = validatedQuery<BatchQuery>(req);
    const result = await inventoryService.itemBatches(
      actorFrom(req),
      id,
      organizationId,
      filter,
    );
    return sendSuccess(
      res,
      "Item batches retrieved successfully",
      result.batches,
      200,
      result.pagination,
    );
  },

  async adjustStock(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    return sendSuccess(
      res,
      "Stock adjusted successfully",
      await inventoryService.adjustStock(
        actorFrom(req),
        id,
        validatedBody<StockAdjustmentInput>(req),
      ),
    );
  },

  async lowStock(req: Request, res: Response) {
    const { organizationId, ...filter } = validatedQuery<StockQuery>(req);
    const result = await inventoryService.lowStock(
      actorFrom(req),
      organizationId,
      filter,
    );
    return sendSuccess(
      res,
      "Low stock items retrieved successfully",
      result.rows,
      200,
      result.pagination,
    );
  },

  async deadStock(req: Request, res: Response) {
    const { organizationId, days, ...filter } = validatedQuery<
      StockQuery & { days: number }
    >(req);
    const result = await inventoryService.deadStock(
      actorFrom(req),
      organizationId,
      days,
      filter,
    );
    return sendSuccess(
      res,
      "Dead stock items retrieved successfully",
      result.rows,
      200,
      result.pagination,
    );
  },

  async expiring(req: Request, res: Response) {
    const { organizationId, days, ...filter } = validatedQuery<
      StockQuery & { days: number }
    >(req);
    const result = await inventoryService.expiring(
      actorFrom(req),
      organizationId,
      days,
      filter,
    );
    return sendSuccess(
      res,
      "Expiring stock retrieved successfully",
      result.rows,
      200,
      result.pagination,
    );
  },

  async scan(req: Request, res: Response) {
    const { value, organizationId } = validatedBody<{
      value: string;
      organizationId?: string;
    }>(req);
    return sendSuccess(
      res,
      "Item scan completed successfully",
      await inventoryService.scan(actorFrom(req), value, organizationId),
    );
  },
};
