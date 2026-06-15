import { Request, Response } from "express";
import { RequestStatus } from "../constants/status";
import { requestService } from "../services/request.service";
import {
  actorFrom,
  validatedBody,
  validatedParams,
  validatedQuery,
} from "./controller.utils";

export const requestController = {
  async create(req: Request, res: Response) {
    res.status(201).json(
      await requestService.create(actorFrom(req), validatedBody(req)),
    );
  },
  async list(req: Request, res: Response) {
    const { status } = validatedQuery<{ status?: RequestStatus }>(req);
    res.json(await requestService.list(actorFrom(req), status));
  },
  async get(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    res.json(await requestService.get(actorFrom(req), id));
  },
  async approve(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    res.json(await requestService.approve(actorFrom(req), id));
  },
  async reject(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { reason } = validatedBody<{ reason: string }>(req);
    res.json(await requestService.reject(actorFrom(req), id, reason));
  },
  async fulfill(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    res.json(await requestService.fulfill(actorFrom(req), id));
  },
  async override(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const body = validatedBody<{
      status:
        | RequestStatus.APPROVED
        | RequestStatus.REJECTED
        | RequestStatus.FULFILLED;
      reason?: string;
    }>(req);
    res.json(
      await requestService.override(actorFrom(req), id, body.status, body.reason),
    );
  },
};
