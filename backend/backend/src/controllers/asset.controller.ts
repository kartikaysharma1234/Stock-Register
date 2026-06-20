import { Request, Response } from "express";
import { AssetListFilter } from "../repository/asset.repository";
import { assetService } from "../services/asset.service";
import {
  actorFrom,
  validatedBody,
  validatedParams,
  validatedQuery,
} from "./controller.utils";

interface OrganizationQuery {
  organizationId?: string;
}

export const assetController = {
  async create(req: Request, res: Response) {
    res.status(201).json(
      await assetService.create(actorFrom(req), validatedBody(req)),
    );
  },

  async list(req: Request, res: Response) {
    const query = validatedQuery<AssetListFilter & OrganizationQuery>(req);
    res.json(
      await assetService.list(actorFrom(req), query.organizationId, query),
    );
  },

  async get(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } = validatedQuery<OrganizationQuery>(req);
    res.json(await assetService.get(actorFrom(req), id, organizationId));
  },

  async update(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } = validatedQuery<OrganizationQuery>(req);
    res.json(
      await assetService.update(
        actorFrom(req),
        id,
        validatedBody(req),
        organizationId,
      ),
    );
  },

  async assign(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } = validatedQuery<OrganizationQuery>(req);
    res.json(
      await assetService.assign(
        actorFrom(req),
        id,
        validatedBody(req),
        organizationId,
      ),
    );
  },

  async returnAsset(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } = validatedQuery<OrganizationQuery>(req);
    res.json(
      await assetService.returnAsset(
        actorFrom(req),
        id,
        validatedBody(req),
        organizationId,
      ),
    );
  },

  async maintenance(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } = validatedQuery<OrganizationQuery>(req);
    res.json(
      await assetService.maintenance(
        actorFrom(req),
        id,
        validatedBody(req),
        organizationId,
      ),
    );
  },

  async dispose(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } = validatedQuery<OrganizationQuery>(req);
    res.json(
      await assetService.dispose(
        actorFrom(req),
        id,
        validatedBody(req),
        organizationId,
      ),
    );
  },

  async dueMaintenance(req: Request, res: Response) {
    const query = validatedQuery<AssetListFilter & OrganizationQuery>(req);
    res.json(
      await assetService.dueMaintenance(
        actorFrom(req),
        query.organizationId,
        query,
      ),
    );
  },

  async assignedToUser(req: Request, res: Response) {
    const { userId } = validatedParams<{ userId: string }>(req);
    const query = validatedQuery<AssetListFilter & OrganizationQuery>(req);
    res.json(
      await assetService.assignedToUser(
        actorFrom(req),
        userId,
        query.organizationId,
        query,
      ),
    );
  },

  async history(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const query = validatedQuery<AssetListFilter & OrganizationQuery>(req);
    res.json(
      await assetService.history(
        actorFrom(req),
        id,
        query.organizationId,
        query,
      ),
    );
  },
};
