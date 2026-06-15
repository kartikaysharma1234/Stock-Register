import { Request, Response } from "express";
import { auditService } from "../services/audit.service";
import { actorFrom, validatedQuery } from "./controller.utils";

export const auditController = {
  async list(req: Request, res: Response) {
    const actor = actorFrom(req);
    res.json(
      await auditService.list(actor.organizationId, validatedQuery(req)),
    );
  },
};
