import {
  PlanLimits,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../constants";

export interface OrganizationContext {
  id: string;
  name: string;
  slug: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  planLimits: PlanLimits;
  isActive: boolean;
}
