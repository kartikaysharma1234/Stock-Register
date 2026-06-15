import { Request, Response } from "express";
import { roleService, RoleInput } from "../services/role.service";
import { sendSuccess } from "../utils/api-response";
import {
  actorFrom,
  validatedBody,
  validatedParams,
  validatedQuery,
} from "./controller.utils";

export const roleController = {
  async list(req: Request, res: Response) {
    const { organizationId } =
      validatedQuery<{ organizationId?: string }>(req);
    return sendSuccess(
      res,
      "Roles retrieved successfully",
      await roleService.list(actorFrom(req), organizationId),
    );
  },

  async create(req: Request, res: Response) {
    return sendSuccess(
      res,
      "Custom role created successfully",
      await roleService.create(
        actorFrom(req),
        validatedBody<RoleInput>(req),
      ),
      201,
    );
  },

  async update(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } =
      validatedQuery<{ organizationId?: string }>(req);
    return sendSuccess(
      res,
      "Custom role updated successfully",
      await roleService.update(
        actorFrom(req),
        id,
        validatedBody(req),
        organizationId,
      ),
    );
  },

  async remove(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } =
      validatedQuery<{ organizationId?: string }>(req);
    await roleService.remove(actorFrom(req), id, organizationId);
    return sendSuccess(res, "Custom role deleted successfully", null);
  },
};
