import { Request, Response } from "express";
import { DepartmentListFilter } from "../repository/department.repository";
import { RequestListFilter } from "../repository/request.repository";
import {
  DepartmentInput,
  departmentService,
} from "../services/department.service";
import { sendSuccess } from "../utils/api-response";
import {
  actorFrom,
  validatedBody,
  validatedParams,
  validatedQuery,
} from "./controller.utils";

interface DepartmentQuery extends DepartmentListFilter {
  organizationId?: string;
}

interface DepartmentRequestQuery extends RequestListFilter {
  organizationId?: string;
}

const organizationIdFrom = (req: Request) =>
  validatedQuery<{ organizationId?: string }>(req).organizationId;

export const departmentController = {
  async list(req: Request, res: Response) {
    const { organizationId, ...filter } =
      validatedQuery<DepartmentQuery>(req);
    const result = await departmentService.list(
      actorFrom(req),
      organizationId,
      filter,
    );
    return sendSuccess(
      res,
      "Departments retrieved successfully",
      result.departments,
      200,
      result.pagination,
    );
  },

  async create(req: Request, res: Response) {
    return sendSuccess(
      res,
      "Department created successfully",
      await departmentService.create(
        actorFrom(req),
        validatedBody<DepartmentInput>(req),
      ),
      201,
    );
  },

  async get(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    return sendSuccess(
      res,
      "Department retrieved successfully",
      await departmentService.get(
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
      "Department updated successfully",
      await departmentService.update(
        actorFrom(req),
        id,
        validatedBody<Partial<DepartmentInput>>(req),
        organizationIdFrom(req),
      ),
    );
  },

  async remove(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    await departmentService.remove(
      actorFrom(req),
      id,
      organizationIdFrom(req),
    );
    return sendSuccess(res, "Department deleted successfully", null);
  },

  async requests(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId, ...filter } =
      validatedQuery<DepartmentRequestQuery>(req);
    const result = await departmentService.requests(
      actorFrom(req),
      id,
      organizationId,
      filter,
    );
    return sendSuccess(
      res,
      "Department requests retrieved successfully",
      result.requests,
      200,
      result.pagination,
    );
  },

  async budget(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    return sendSuccess(
      res,
      "Department budget retrieved successfully",
      await departmentService.budget(
        actorFrom(req),
        id,
        organizationIdFrom(req),
      ),
    );
  },
};
