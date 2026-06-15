import { redisCache } from "../caches/redis.cache";
import { organisationRepository } from "../repository/organisation.repository";
import { OrganizationContext } from "../types/organization";

const CACHE_TTL_SECONDS = 300;

export class OrganizationContextService {
  private cacheKey(organizationId: string) {
    return `organization:context:${organizationId}`;
  }

  async get(organizationId: string): Promise<OrganizationContext | null> {
    try {
      const cached = await redisCache.get<OrganizationContext>(
        this.cacheKey(organizationId),
      );
      if (cached) return cached;
    } catch {
      // MongoDB remains the source of truth when Redis is unavailable.
    }
    const organization =
      await organisationRepository.findOrganizationById(organizationId);
    if (!organization) return null;
    const context: OrganizationContext = {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      subscriptionPlan: organization.subscriptionPlan,
      subscriptionStatus: organization.subscriptionStatus,
      planLimits: {
        maxUsers: organization.planLimits.maxUsers,
        maxWarehouses: organization.planLimits.maxWarehouses,
        maxItems: organization.planLimits.maxItems,
        apiAccess: organization.planLimits.apiAccess,
        whitelabel: organization.planLimits.whitelabel,
        requestsPerMinute: organization.planLimits.requestsPerMinute,
      },
      isActive: organization.isActive,
    };
    try {
      await redisCache.set(
        this.cacheKey(organizationId),
        context,
        CACHE_TTL_SECONDS,
      );
    } catch {
      // Cache writes are best-effort.
    }
    return context;
  }

  async invalidate(organizationId: string) {
    try {
      await redisCache.del(this.cacheKey(organizationId));
    } catch {
      // Cache invalidation is best-effort.
    }
  }
}

export const organizationContextService = new OrganizationContextService();
