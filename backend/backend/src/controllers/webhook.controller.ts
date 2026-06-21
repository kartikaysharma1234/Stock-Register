import { Request, Response } from "express";
import {
  WebhookDeliveryListFilter,
  WebhookListFilter,
} from "../repository/webhook.repository";
import {
  WebhookInput,
  WebhookUpdateInput,
  webhookService,
} from "../services/webhook.service";
import { sendSuccess } from "../utils/api-response";
import {
  actorFrom,
  validatedBody,
  validatedParams,
  validatedQuery,
} from "./controller.utils";

export const webhookController = {
  async create(req: Request, res: Response) {
    return sendSuccess(
      res,
      "Webhook created successfully. Store the secret now; it will not be shown again.",
      await webhookService.create(
        actorFrom(req),
        validatedBody<WebhookInput>(req),
      ),
      201,
    );
  },

  async list(req: Request, res: Response) {
    const query = validatedQuery<WebhookListFilter & { organizationId?: string }>(
      req,
    );
    const result = await webhookService.list(
      actorFrom(req),
      query.organizationId,
      query,
    );
    return sendSuccess(
      res,
      "Webhooks fetched successfully",
      result.webhooks,
      200,
      result.pagination,
    );
  },

  async get(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const query = validatedQuery<{ organizationId?: string }>(req);
    return sendSuccess(
      res,
      "Webhook fetched successfully",
      await webhookService.get(actorFrom(req), id, query.organizationId),
    );
  },

  async update(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const query = validatedQuery<{ organizationId?: string }>(req);
    return sendSuccess(
      res,
      "Webhook updated successfully",
      await webhookService.update(
        actorFrom(req),
        id,
        validatedBody<WebhookUpdateInput>(req),
        query.organizationId,
      ),
    );
  },

  async rotateSecret(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const query = validatedQuery<{ organizationId?: string }>(req);
    return sendSuccess(
      res,
      "Webhook secret rotated successfully. Store the secret now; it will not be shown again.",
      await webhookService.rotateSecret(actorFrom(req), id, query.organizationId),
    );
  },

  async remove(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const query = validatedQuery<{ organizationId?: string }>(req);
    await webhookService.remove(actorFrom(req), id, query.organizationId);
    return sendSuccess(res, "Webhook deleted successfully", null);
  },

  async deliveries(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const query = validatedQuery<
      WebhookDeliveryListFilter & { organizationId?: string }
    >(req);
    const result = await webhookService.deliveries(
      actorFrom(req),
      id,
      query.organizationId,
      query,
    );
    return sendSuccess(
      res,
      "Webhook deliveries fetched successfully",
      result.deliveries,
      200,
      result.pagination,
    );
  },

  async test(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const query = validatedQuery<{ organizationId?: string }>(req);
    return sendSuccess(
      res,
      "Webhook test delivery queued successfully",
      await webhookService.test(actorFrom(req), id, query.organizationId),
      202,
    );
  },
};
