import { NextFunction, Request, Response } from "express";
import { Role } from "../constants";
import { organizationContextService } from "../services/organization-context.service";
import { ApiError } from "../utils/api-error";

export const extractOrganization = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      if (req.user?.role === Role.SUPER_ADMIN) return next();
      return next(new ApiError(400, "Organization context is required"));
    }
    const organization = await organizationContextService.get(organizationId);
    if (!organization || !organization.isActive) {
      return next(new ApiError(403, "Organization is inactive or unavailable"));
    }
    req.organization = organization;
    return next();
  } catch (error) {
    return next(error);
  }
};
