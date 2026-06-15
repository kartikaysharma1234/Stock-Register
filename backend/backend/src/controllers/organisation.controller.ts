import { Request, Response } from "express";
import { organisationService } from "../services/organisation.service";
import {
  actorFrom,
  validatedBody,
  validatedParams,
} from "./controller.utils";

export const organisationController = {
  async createOrganization(req: Request, res: Response) {
    res.status(201).json(
      await organisationService.createOrganization(
        actorFrom(req),
        validatedBody(req),
      ),
    );
  },
  async listOrganizations(req: Request, res: Response) {
    res.json(await organisationService.listOrganizations(actorFrom(req)));
  },
  async getCurrentOrganization(req: Request, res: Response) {
    res.json(await organisationService.getOrganization(actorFrom(req)));
  },
  async updateCurrentOrganization(req: Request, res: Response) {
    res.json(
      await organisationService.updateOrganization(
        actorFrom(req),
        undefined,
        validatedBody(req),
      ),
    );
  },
  async updateOrganization(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    res.json(
      await organisationService.updateOrganization(
        actorFrom(req),
        id,
        validatedBody(req),
      ),
    );
  },
  async createDepartment(req: Request, res: Response) {
    res.status(201).json(
      await organisationService.createDepartment(actorFrom(req), validatedBody(req)),
    );
  },
  async listDepartments(req: Request, res: Response) {
    res.json(await organisationService.listDepartments(actorFrom(req)));
  },
  async updateDepartment(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    res.json(
      await organisationService.updateDepartment(
        actorFrom(req),
        id,
        validatedBody(req),
      ),
    );
  },
  async createWarehouse(req: Request, res: Response) {
    res.status(201).json(
      await organisationService.createWarehouse(actorFrom(req), validatedBody(req)),
    );
  },
  async listWarehouses(req: Request, res: Response) {
    res.json(await organisationService.listWarehouses(actorFrom(req)));
  },
  async updateWarehouse(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    res.json(
      await organisationService.updateWarehouse(
        actorFrom(req),
        id,
        validatedBody(req),
      ),
    );
  },
  async createCategory(req: Request, res: Response) {
    res.status(201).json(
      await organisationService.createCategory(actorFrom(req), validatedBody(req)),
    );
  },
  async listCategories(req: Request, res: Response) {
    res.json(await organisationService.listCategories(actorFrom(req)));
  },
  async updateCategory(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    res.json(
      await organisationService.updateCategory(
        actorFrom(req),
        id,
        validatedBody(req),
      ),
    );
  },
};
