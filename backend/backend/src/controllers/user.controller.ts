import { Request, Response } from "express";
import { Permission } from "../constants";
import { authService } from "../services/auth.service";
import {
  UserCreateInput,
  UserUpdateInput,
  userService,
} from "../services/user.service";
import { UserListOptions } from "../repository/user.repository";
import { sendSuccess } from "../utils/api-response";
import {
  actorFrom,
  validatedBody,
  validatedParams,
  validatedQuery,
} from "./controller.utils";

interface UserListQuery extends UserListOptions {
  organizationId?: string;
}

export const userController = {
  async list(req: Request, res: Response) {
    const { organizationId, ...options } =
      validatedQuery<UserListQuery>(req);
    const result = await userService.list(
      actorFrom(req),
      organizationId,
      options,
    );
    return sendSuccess(
      res,
      "Users retrieved successfully",
      result.users,
      200,
      result.pagination,
    );
  },

  async get(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } =
      validatedQuery<{ organizationId?: string }>(req);
    return sendSuccess(
      res,
      "User retrieved successfully",
      await userService.get(actorFrom(req), id, organizationId),
    );
  },

  async create(req: Request, res: Response) {
    const user = await userService.create(
      actorFrom(req),
      validatedBody<UserCreateInput>(req),
    );
    await authService.sendEmailVerification(user);
    return sendSuccess(res, "User created successfully", user, 201);
  },

  async update(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } =
      validatedQuery<{ organizationId?: string }>(req);
    return sendSuccess(
      res,
      "User updated successfully",
      await userService.update(
        actorFrom(req),
        id,
        validatedBody<UserUpdateInput>(req),
        organizationId,
      ),
    );
  },

  async setPermissions(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } =
      validatedQuery<{ organizationId?: string }>(req);
    const { permissions } = validatedBody<{ permissions: Permission[] }>(req);
    return sendSuccess(
      res,
      "User permissions updated successfully",
      await userService.setPermissions(
        actorFrom(req),
        id,
        permissions,
        organizationId,
      ),
    );
  },

  async remove(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } =
      validatedQuery<{ organizationId?: string }>(req);
    await userService.remove(actorFrom(req), id, organizationId);
    return sendSuccess(res, "User deleted successfully", null);
  },
};
