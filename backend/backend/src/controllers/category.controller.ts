import { Request, Response } from "express";
import { CategoryListFilter } from "../repository/inventory.repository";
import {
  CategoryInput,
  inventoryService,
} from "../services/inventory.service";
import { sendSuccess } from "../utils/api-response";
import {
  actorFrom,
  validatedBody,
  validatedParams,
  validatedQuery,
} from "./controller.utils";

interface CategoryQuery extends CategoryListFilter {
  organizationId?: string;
}

export const categoryController = {
  async list(req: Request, res: Response) {
    const { organizationId, ...filter } =
      validatedQuery<CategoryQuery>(req);
    const result = await inventoryService.listCategories(
      actorFrom(req),
      organizationId,
      filter,
    );
    return sendSuccess(
      res,
      "Categories retrieved successfully",
      result.categories,
      200,
      result.pagination,
    );
  },

  async create(req: Request, res: Response) {
    return sendSuccess(
      res,
      "Category created successfully",
      await inventoryService.createCategory(
        actorFrom(req),
        validatedBody<CategoryInput>(req),
      ),
      201,
    );
  },

  async update(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } =
      validatedQuery<{ organizationId?: string }>(req);
    return sendSuccess(
      res,
      "Category updated successfully",
      await inventoryService.updateCategory(
        actorFrom(req),
        id,
        validatedBody<Partial<CategoryInput>>(req),
        organizationId,
      ),
    );
  },

  async remove(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } =
      validatedQuery<{ organizationId?: string }>(req);
    await inventoryService.deleteCategory(
      actorFrom(req),
      id,
      organizationId,
    );
    return sendSuccess(res, "Category deleted successfully", null);
  },
};
