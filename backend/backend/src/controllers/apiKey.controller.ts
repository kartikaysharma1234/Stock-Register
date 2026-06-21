import { Request, Response } from "express";
import {
  ApiKeyListFilter,
  ApiKeyUsageFilter,
} from "../repository/apiKey.repository";
import {
  ApiKeyCreateInput,
  ApiKeyUpdateInput,
  apiKeyService,
} from "../services/apiKey.service";
import { sendSuccess } from "../utils/api-response";
import {
  actorFrom,
  validatedBody,
  validatedParams,
  validatedQuery,
} from "./controller.utils";

export const apiKeyController = {
  async create(req: Request, res: Response) {
    return sendSuccess(
      res,
      "API key created successfully. Store the key now; it will not be shown again.",
      await apiKeyService.create(
        actorFrom(req),
        validatedBody<ApiKeyCreateInput>(req),
      ),
      201,
    );
  },

  async list(req: Request, res: Response) {
    const query = validatedQuery<ApiKeyListFilter & { organizationId?: string }>(
      req,
    );
    const result = await apiKeyService.list(
      actorFrom(req),
      query.organizationId,
      query,
    );
    return sendSuccess(
      res,
      "API keys fetched successfully",
      result.apiKeys,
      200,
      result.pagination,
    );
  },

  async get(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const query = validatedQuery<{ organizationId?: string }>(req);
    return sendSuccess(
      res,
      "API key fetched successfully",
      await apiKeyService.get(actorFrom(req), id, query.organizationId),
    );
  },

  async update(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const query = validatedQuery<{ organizationId?: string }>(req);
    return sendSuccess(
      res,
      "API key updated successfully",
      await apiKeyService.update(
        actorFrom(req),
        id,
        validatedBody<ApiKeyUpdateInput>(req),
        query.organizationId,
      ),
    );
  },

  async rotate(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const query = validatedQuery<{ organizationId?: string }>(req);
    return sendSuccess(
      res,
      "API key rotated successfully. Store the new key now; it will not be shown again.",
      await apiKeyService.rotate(actorFrom(req), id, query.organizationId),
    );
  },

  async revoke(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const query = validatedQuery<{ organizationId?: string }>(req);
    const body = validatedBody<{ reason?: string }>(req);
    return sendSuccess(
      res,
      "API key revoked successfully",
      await apiKeyService.revoke(
        actorFrom(req),
        id,
        body.reason,
        query.organizationId,
      ),
    );
  },

  async remove(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const query = validatedQuery<{ organizationId?: string }>(req);
    await apiKeyService.remove(actorFrom(req), id, query.organizationId);
    return sendSuccess(res, "API key deleted successfully", null);
  },

  async usage(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const query = validatedQuery<ApiKeyUsageFilter & { organizationId?: string }>(
      req,
    );
    const result = await apiKeyService.usage(
      actorFrom(req),
      id,
      query.organizationId,
      query,
    );
    return sendSuccess(
      res,
      "API key usage logs fetched successfully",
      result.logs,
      200,
      result.pagination,
    );
  },
};
