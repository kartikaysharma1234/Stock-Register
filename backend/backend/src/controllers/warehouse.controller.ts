import { Request, Response } from "express";
import {
  WarehouseListOptions,
  WarehouseMovementListOptions,
  WarehouseStockListOptions,
  WarehouseZoneListOptions,
} from "../repository/warehouse.repository";
import {
  WarehouseCreateInput,
  WarehouseUpdateInput,
  WarehouseZoneInput,
  warehouseService,
} from "../services/warehouse.service";
import { sendSuccess } from "../utils/api-response";
import {
  actorFrom,
  validatedBody,
  validatedParams,
  validatedQuery,
} from "./controller.utils";

interface WarehouseListQuery extends WarehouseListOptions {
  organizationId?: string;
}

interface WarehouseZoneListQuery extends WarehouseZoneListOptions {
  organizationId?: string;
}

interface WarehouseStockQuery extends WarehouseStockListOptions {
  organizationId?: string;
}

interface WarehouseMovementQuery extends WarehouseMovementListOptions {
  organizationId?: string;
}

const organizationIdFrom = (req: Request) =>
  validatedQuery<{ organizationId?: string }>(req).organizationId;

export const warehouseController = {
  async list(req: Request, res: Response) {
    const { organizationId, ...options } =
      validatedQuery<WarehouseListQuery>(req);
    const result = await warehouseService.list(
      actorFrom(req),
      organizationId,
      options,
    );
    return sendSuccess(
      res,
      "Warehouses retrieved successfully",
      result.warehouses,
      200,
      result.pagination,
    );
  },

  async create(req: Request, res: Response) {
    return sendSuccess(
      res,
      "Warehouse created successfully",
      await warehouseService.create(
        actorFrom(req),
        validatedBody<WarehouseCreateInput>(req),
      ),
      201,
    );
  },

  async get(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    return sendSuccess(
      res,
      "Warehouse retrieved successfully",
      await warehouseService.get(
        actorFrom(req),
        id,
        organizationIdFrom(req),
      ),
    );
  },

  async update(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    return sendSuccess(
      res,
      "Warehouse updated successfully",
      await warehouseService.update(
        actorFrom(req),
        id,
        validatedBody<WarehouseUpdateInput>(req),
        organizationIdFrom(req),
      ),
    );
  },

  async remove(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    await warehouseService.remove(
      actorFrom(req),
      id,
      organizationIdFrom(req),
    );
    return sendSuccess(res, "Warehouse deleted successfully", null);
  },

  async listZones(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId, ...options } =
      validatedQuery<WarehouseZoneListQuery>(req);
    const result = await warehouseService.listZones(
      actorFrom(req),
      id,
      organizationId,
      options,
    );
    return sendSuccess(
      res,
      "Warehouse zones retrieved successfully",
      result.zones,
      200,
      result.pagination,
    );
  },

  async createZone(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    return sendSuccess(
      res,
      "Warehouse zone created successfully",
      await warehouseService.createZone(
        actorFrom(req),
        id,
        validatedBody<WarehouseZoneInput>(req),
        organizationIdFrom(req),
      ),
      201,
    );
  },

  async updateZone(req: Request, res: Response) {
    const { id, zoneId } = validatedParams<{
      id: string;
      zoneId: string;
    }>(req);
    return sendSuccess(
      res,
      "Warehouse zone updated successfully",
      await warehouseService.updateZone(
        actorFrom(req),
        id,
        zoneId,
        validatedBody<Partial<WarehouseZoneInput>>(req),
        organizationIdFrom(req),
      ),
    );
  },

  async stock(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId, ...options } =
      validatedQuery<WarehouseStockQuery>(req);
    const result = await warehouseService.stock(
      actorFrom(req),
      id,
      organizationId,
      options,
    );
    return sendSuccess(
      res,
      "Warehouse stock retrieved successfully",
      result.stock,
      200,
      result.pagination,
    );
  },

  async movements(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId, ...options } =
      validatedQuery<WarehouseMovementQuery>(req);
    const result = await warehouseService.movements(
      actorFrom(req),
      id,
      organizationId,
      options,
    );
    return sendSuccess(
      res,
      "Warehouse movements retrieved successfully",
      result.movements,
      200,
      result.pagination,
    );
  },
};
