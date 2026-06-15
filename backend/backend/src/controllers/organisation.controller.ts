import { Request, Response } from "express";
import { SubscriptionPlan } from "../constants";
import { organisationService } from "../services/organisation.service";
import { ApiError } from "../utils/api-error";
import { sendSuccess } from "../utils/api-response";
import {
  actorFrom,
  validatedBody,
  validatedParams,
} from "./controller.utils";

export const organisationController = {
  async register(req: Request, res: Response) {
    const result = await organisationService.register(
      validatedBody(req),
      req.ip,
    );
    return sendSuccess(
      res,
      "Organization registered successfully",
      result,
      201,
    );
  },
  async me(req: Request, res: Response) {
    return sendSuccess(
      res,
      "Organization retrieved successfully",
      await organisationService.getOrganization(actorFrom(req)),
    );
  },
  async updateMe(req: Request, res: Response) {
    return sendSuccess(
      res,
      "Organization updated successfully",
      await organisationService.updateOrganization(
        actorFrom(req),
        undefined,
        validatedBody(req),
      ),
    );
  },
  async usage(req: Request, res: Response) {
    return sendSuccess(
      res,
      "Organization usage retrieved successfully",
      await organisationService.getUsage(actorFrom(req)),
    );
  },
  async upgrade(req: Request, res: Response) {
    const { plan } = validatedBody<{ plan: SubscriptionPlan }>(req);
    return sendSuccess(
      res,
      "Razorpay subscription created successfully",
      await organisationService.upgrade(actorFrom(req), plan),
      201,
    );
  },
  async razorpayWebhook(req: Request, res: Response) {
    const signature = req.get("x-razorpay-signature");
    if (!signature || !req.rawBody) {
      throw new ApiError(400, "Razorpay signature and raw body are required");
    }
    const result = await organisationService.handleRazorpayWebhook(
      req.rawBody,
      signature,
      req.get("x-razorpay-event-id"),
    );
    return sendSuccess(res, "Razorpay webhook processed", result);
  },
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
