import { Request, Response } from "express";
import { userService } from "../services/user.service";
import {
  actorFrom,
  validatedBody,
  validatedParams,
  validatedQuery,
} from "./controller.utils";

export const userController = {
  async list(req: Request, res: Response) {
    const { organizationId } = validatedQuery<{ organizationId?: string }>(req);
    res.json(await userService.list(actorFrom(req), organizationId));
  },
  async update(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    res.json(
      await userService.update(actorFrom(req), id, validatedBody(req)),
    );
  },
};
