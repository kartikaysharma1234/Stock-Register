import { Request, Response } from "express";
import { RequestStatus } from "../constants";
import { RequestListFilter } from "../repository/request.repository";
import {
  RequestApprovalInput,
  RequestCreateInput,
  RequestFulfillmentInput,
  RequestUpdateInput,
  requestService,
} from "../services/request.service";
import { sendSuccess } from "../utils/api-response";
import {
  actorFrom,
  validatedBody,
  validatedParams,
  validatedQuery,
} from "./controller.utils";

interface RequestQuery extends RequestListFilter {
  organizationId?: string;
}

const organizationIdFrom = (req: Request) =>
  validatedQuery<{ organizationId?: string }>(req).organizationId;

export const requestController = {
  async create(req: Request, res: Response) {
    return sendSuccess(
      res,
      "Stock request created successfully",
      await requestService.create(
        actorFrom(req),
        validatedBody<RequestCreateInput>(req),
      ),
      201,
    );
  },

  async list(req: Request, res: Response) {
    const { organizationId, ...filter } =
      validatedQuery<RequestQuery>(req);
    const result = await requestService.list(
      actorFrom(req),
      organizationId,
      filter,
    );
    return sendSuccess(
      res,
      "Stock requests retrieved successfully",
      result.requests,
      200,
      result.pagination,
    );
  },

  async pending(req: Request, res: Response) {
    const { organizationId, ...filter } =
      validatedQuery<RequestQuery>(req);
    const result = await requestService.pending(
      actorFrom(req),
      organizationId,
      filter,
    );
    return sendSuccess(
      res,
      "Pending approvals retrieved successfully",
      result.requests,
      200,
      result.pagination,
    );
  },

  async get(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    return sendSuccess(
      res,
      "Stock request retrieved successfully",
      await requestService.get(
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
      "Stock request updated successfully",
      await requestService.update(
        actorFrom(req),
        id,
        validatedBody<RequestUpdateInput>(req),
        organizationIdFrom(req),
      ),
    );
  },

  async submit(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { comments } = validatedBody<{ comments?: string }>(req);
    return sendSuccess(
      res,
      "Stock request submitted successfully",
      await requestService.submit(
        actorFrom(req),
        id,
        comments,
        organizationIdFrom(req),
      ),
    );
  },

  async approve(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    return sendSuccess(
      res,
      "Stock request approved successfully",
      await requestService.approve(
        actorFrom(req),
        id,
        validatedBody<RequestApprovalInput>(req),
        organizationIdFrom(req),
      ),
    );
  },

  async reject(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const body = validatedBody<{
      reason: string;
      comments?: string;
    }>(req);
    return sendSuccess(
      res,
      "Stock request rejected successfully",
      await requestService.reject(
        actorFrom(req),
        id,
        body.reason,
        body.comments,
        organizationIdFrom(req),
      ),
    );
  },

  async fulfill(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    return sendSuccess(
      res,
      "Stock request fulfillment recorded successfully",
      await requestService.fulfill(
        actorFrom(req),
        id,
        validatedBody<RequestFulfillmentInput>(req),
        organizationIdFrom(req),
      ),
    );
  },

  async cancel(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { comments } = validatedBody<{ comments?: string }>(req);
    return sendSuccess(
      res,
      "Stock request cancelled successfully",
      await requestService.cancel(
        actorFrom(req),
        id,
        comments,
        organizationIdFrom(req),
      ),
    );
  },

  async override(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const body = validatedBody<{
      status:
        | RequestStatus.DEPT_APPROVED
        | RequestStatus.STORE_APPROVED
        | RequestStatus.APPROVED
        | RequestStatus.REJECTED
        | RequestStatus.FULFILLED
        | RequestStatus.CANCELLED;
      reason?: string;
    }>(req);
    return sendSuccess(
      res,
      "Stock request overridden successfully",
      await requestService.override(
        actorFrom(req),
        id,
        body.status,
        body.reason,
        organizationIdFrom(req),
      ),
    );
  },
};
