import { NextFunction, Request, Response } from "express";
import { PlanFeature } from "../constants";
import {
  OrganizationUsage,
  organisationRepository,
} from "../repository/organisation.repository";
import { ApiError } from "../utils/api-error";

export interface PlanLimitEvaluation {
  allowed: boolean;
  limit: number | boolean | null;
  current?: number;
}

export const evaluatePlanLimit = (
  feature: PlanFeature,
  organization: NonNullable<Request["organization"]>,
  usage?: OrganizationUsage,
): PlanLimitEvaluation => {
  switch (feature) {
    case PlanFeature.API_ACCESS:
      return {
        allowed: organization.planLimits.apiAccess,
        limit: organization.planLimits.apiAccess,
      };
    case PlanFeature.WHITELABEL:
      return {
        allowed: organization.planLimits.whitelabel,
        limit: organization.planLimits.whitelabel,
      };
    case PlanFeature.USERS: {
      const limit = organization.planLimits.maxUsers;
      const current = usage?.users ?? 0;
      return { allowed: limit === null || current < limit, limit, current };
    }
    case PlanFeature.WAREHOUSES: {
      const limit = organization.planLimits.maxWarehouses;
      const current = usage?.warehouses ?? 0;
      return { allowed: limit === null || current < limit, limit, current };
    }
    case PlanFeature.ITEMS: {
      const limit = organization.planLimits.maxItems;
      const current = usage?.items ?? 0;
      return { allowed: limit === null || current < limit, limit, current };
    }
  }
};

export const checkPlanLimit =
  (feature: PlanFeature) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.organization) {
        return next(new ApiError(500, "Organization middleware is required"));
      }
      const usage = [
        PlanFeature.USERS,
        PlanFeature.WAREHOUSES,
        PlanFeature.ITEMS,
      ].includes(feature)
        ? await organisationRepository.getUsage(req.organization.id)
        : undefined;
      const evaluation = evaluatePlanLimit(feature, req.organization, usage);
      if (!evaluation.allowed) {
        return next(
          new ApiError(403, `Plan limit reached for ${feature}`, evaluation),
        );
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
