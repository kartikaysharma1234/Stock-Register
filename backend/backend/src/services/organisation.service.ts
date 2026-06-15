import mongoose from "mongoose";
import {
  PLAN_LIMITS,
  Role,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../constants";
import { hashPassword } from "../helpers/hashing.helper";
import {
  organizationCodeFromSlug,
  toSlug,
} from "../helpers/slug.helper";
import {
  OrganizationCreateInput,
  organisationRepository,
} from "../repository/organisation.repository";
import { userRepository } from "../repository/user.repository";
import { redisClient } from "../caches/redis.cache";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { logger } from "../utils/logger";
import { auditService } from "./audit.service";
import { authService } from "./auth.service";
import { billingService } from "./billing.service";
import { notificationService } from "./notification.service";
import { organizationContextService } from "./organization-context.service";
import { NotificationType } from "../constants/status";

export interface OrganizationRegistrationInput {
  organization: {
    name: string;
    slug?: string;
    logo?: string;
    address?: OrganizationCreateInput["address"];
    gstin?: string;
    billingEmail: string;
    phone?: string;
  };
  admin: {
    name: string;
    email: string;
    password: string;
  };
}

export interface RazorpayWebhookResult {
  duplicate: boolean;
  handled: boolean;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nestedRecord = (
  value: UnknownRecord,
  ...path: string[]
): UnknownRecord | undefined => {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return isRecord(current) ? current : undefined;
};

const optionalString = (record: UnknownRecord | undefined, key: string) => {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
};

export class OrganisationService {
  private organizationId(actor: AuthUser, requestedOrganizationId?: string) {
    if (actor.role === Role.SUPER_ADMIN && requestedOrganizationId) {
      return requestedOrganizationId;
    }
    if (!actor.organizationId) {
      throw new ApiError(400, "Organization context is required");
    }
    return actor.organizationId;
  }

  async register(data: OrganizationRegistrationInput, ipAddress?: string) {
    const slug = toSlug(data.organization.slug ?? data.organization.name);
    if (!slug) throw new ApiError(422, "Organization slug is invalid");
    const [existingOrganization, existingUser] = await Promise.all([
      organisationRepository.findOrganizationBySlug(slug),
      userRepository.findByEmail(data.admin.email),
    ]);
    if (existingOrganization) {
      throw new ApiError(409, "Organization slug is already in use");
    }
    if (existingUser) {
      throw new ApiError(409, "A user with this email already exists");
    }

    const session = await mongoose.startSession();
    let registration;
    try {
      registration = await session.withTransaction(async () => {
        const organization = await organisationRepository.createOrganization(
          {
            name: data.organization.name,
            slug,
            code: organizationCodeFromSlug(slug),
            logo: data.organization.logo,
            address: data.organization.address,
            gstin: data.organization.gstin,
            billingEmail: data.organization.billingEmail,
            email: data.organization.billingEmail,
            phone: data.organization.phone,
            subscriptionPlan: SubscriptionPlan.FREE,
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            planLimits: { ...PLAN_LIMITS[SubscriptionPlan.FREE] },
          },
          session,
        );
        const admin = await userRepository.create(
          {
            organizationId: organization.id,
            name: data.admin.name,
            email: data.admin.email,
            passwordHash: await hashPassword(data.admin.password),
            role: Role.ADMIN,
            departmentIds: [],
            warehouseIds: [],
            emailVerified: false,
          },
          session,
        );
        const subscription = await organisationRepository.createSubscription(
          {
            organizationId: organization.id,
            plan: SubscriptionPlan.FREE,
            status: SubscriptionStatus.ACTIVE,
            startDate: new Date(),
            amount: 0,
            currency: "INR",
          },
          session,
        );
        return { organization, admin, subscription };
      });
    } finally {
      await session.endSession();
    }

    if (!registration) {
      throw new ApiError(500, "Organization registration did not complete");
    }
    const { organization, admin, subscription } = registration;
    void authService.sendEmailVerification(admin).catch((error) =>
      logger.error("Failed to queue admin verification email", { error }),
    );
    await auditService.record(
      {
        actorId: admin.id,
        organizationId: organization.id,
        ipAddress,
      },
      {
        action: "organization.registered",
        entityType: "Organization",
        entityId: organization.id,
        after: organization.toObject(),
      },
    );
    void notificationService
      .notifyUser({
        organizationId: organization.id,
        userId: admin.id,
        type: NotificationType.SYSTEM,
        title: "Welcome to Stock Register",
        message: `${organization.name} is ready to use.`,
        template: "welcomeOrganization",
        variables: {
          name: admin.name,
          organizationName: organization.name,
        },
      })
      .catch((error) =>
        logger.error("Failed to queue organization welcome email", { error }),
      );
    return {
      organization,
      admin,
      subscription,
      verificationRequired: true,
    };
  }

  async createOrganization(actor: AuthUser, data: Record<string, unknown>) {
    if (actor.role !== Role.SUPER_ADMIN) {
      throw new ApiError(403, "Only super admins can create organizations");
    }
    const name = String(data.name);
    const slug = toSlug(String(data.slug ?? name));
    const organization = await organisationRepository.createOrganization({
      ...(data as Omit<
        OrganizationCreateInput,
        "name" | "slug" | "code" | "billingEmail"
      >),
      name,
      slug,
      code: String(data.code ?? organizationCodeFromSlug(slug)),
      billingEmail: String(data.billingEmail ?? data.email),
    });
    await auditService.record(
      { actorId: actor.id },
      {
        action: "organization.create",
        entityType: "Organization",
        entityId: organization.id,
        after: organization.toObject(),
      },
    );
    return organization;
  }

  listOrganizations(actor: AuthUser) {
    if (actor.role !== Role.SUPER_ADMIN) {
      throw new ApiError(403, "Only super admins can list all organizations");
    }
    return organisationRepository.listOrganizations();
  }

  async getOrganization(actor: AuthUser, id?: string) {
    const organizationId =
      actor.role === Role.SUPER_ADMIN && id ? id : actor.organizationId;
    if (!organizationId) throw new ApiError(400, "Organization is required");
    const organization =
      await organisationRepository.findOrganizationById(organizationId);
    if (!organization) throw new ApiError(404, "Organization not found");
    return organization;
  }

  async updateOrganization(
    actor: AuthUser,
    id: string | undefined,
    data: Record<string, unknown>,
  ) {
    const organizationId =
      actor.role === Role.SUPER_ADMIN && id ? id : actor.organizationId;
    if (!organizationId) throw new ApiError(400, "Organization is required");
    const update = { ...data };
    if (typeof update.slug === "string") {
      update.slug = toSlug(update.slug);
    }
    const organization = await organisationRepository.updateOrganization(
      organizationId,
      update,
    );
    if (!organization) throw new ApiError(404, "Organization not found");
    await organizationContextService.invalidate(organizationId);
    return organization;
  }

  async getUsage(actor: AuthUser) {
    const organizationId = this.organizationId(actor);
    const [organization, usage] = await Promise.all([
      organisationRepository.findOrganizationById(organizationId),
      organisationRepository.getUsage(organizationId),
    ]);
    if (!organization) throw new ApiError(404, "Organization not found");
    return {
      plan: organization.subscriptionPlan,
      status: organization.subscriptionStatus,
      limits: organization.planLimits,
      usage,
    };
  }

  async upgrade(actor: AuthUser, plan: SubscriptionPlan) {
    if (plan === SubscriptionPlan.FREE) {
      throw new ApiError(422, "FREE is not a paid upgrade plan");
    }
    const organizationId = this.organizationId(actor);
    const organization =
      await organisationRepository.findOrganizationById(organizationId);
    if (!organization) throw new ApiError(404, "Organization not found");
    if (
      organization.subscriptionPlan === plan &&
      organization.subscriptionStatus === SubscriptionStatus.ACTIVE
    ) {
      throw new ApiError(409, `Organization is already on the ${plan} plan`);
    }
    if (await organisationRepository.findPendingSubscription(organizationId)) {
      throw new ApiError(409, "A subscription upgrade is already pending");
    }

    const remoteSubscription = await billingService.createSubscription({
      organizationId,
      plan,
      billingEmail: organization.billingEmail,
      phone: organization.phone,
    });
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await organisationRepository.createSubscription(
          {
            organizationId,
            plan,
            status: SubscriptionStatus.PENDING,
            startDate: new Date(),
            amount: billingService.getPlanAmount(plan),
            currency: "INR",
            razorpaySubscriptionId: remoteSubscription.id,
          },
          session,
        );
        await organisationRepository.updateOrganization(
          organizationId,
          {
            ...(remoteSubscription.customerId
              ? { razorpayCustomerId: remoteSubscription.customerId }
              : {}),
          },
          session,
        );
      });
    } catch (error) {
      await billingService
        .cancelSubscription(remoteSubscription.id)
        .catch((cancelError) =>
          logger.error("Failed to cancel orphaned Razorpay subscription", {
            cancelError,
            razorpaySubscriptionId: remoteSubscription.id,
          }),
        );
      throw error;
    } finally {
      await session.endSession();
    }

    return {
      keyId: billingService.getPublicKey(),
      subscriptionId: remoteSubscription.id,
      shortUrl: remoteSubscription.shortUrl,
      plan,
      amount: billingService.getPlanAmount(plan),
      currency: "INR",
    };
  }

  async handleRazorpayWebhook(
    rawBody: Buffer,
    signature: string,
    eventId?: string,
  ): Promise<RazorpayWebhookResult> {
    if (!billingService.verifyWebhookSignature(rawBody, signature)) {
      throw new ApiError(401, "Invalid Razorpay webhook signature");
    }
    const idempotencyKey = eventId
      ? `razorpay:webhook:event:${eventId}`
      : undefined;
    if (idempotencyKey) {
      try {
        const claimed = await redisClient.set(
          idempotencyKey,
          "processing",
          "EX",
          300,
          "NX",
        );
        if (claimed === null) return { duplicate: true, handled: false };
      } catch {
        // Signature verification still protects processing if Redis is down.
      }
    }

    try {
      const parsed = JSON.parse(rawBody.toString("utf8")) as unknown;
      if (!isRecord(parsed)) {
        throw new ApiError(400, "Invalid Razorpay webhook payload");
      }
      const event = optionalString(parsed, "event");
      const subscriptionEntity = nestedRecord(
        parsed,
        "payload",
        "subscription",
        "entity",
      );
      const razorpaySubscriptionId = optionalString(subscriptionEntity, "id");
      if (!event || !razorpaySubscriptionId) {
        return { duplicate: false, handled: false };
      }
      const localSubscription =
        await organisationRepository.findSubscriptionByRazorpayId(
          razorpaySubscriptionId,
        );
      if (!localSubscription) {
        throw new ApiError(
          409,
          "Razorpay subscription is not available locally yet",
          { event, razorpaySubscriptionId },
        );
      }

      const organizationId = localSubscription.organizationId.toString();
      const organization =
        await organisationRepository.findOrganizationById(organizationId);
      if (!organization) {
        throw new ApiError(404, "Organization not found for subscription");
      }
      const paymentEntity = nestedRecord(
        parsed,
        "payload",
        "payment",
        "entity",
      );
      const invoiceEntity = nestedRecord(
        parsed,
        "payload",
        "invoice",
        "entity",
      );
      const paymentId = optionalString(paymentEntity, "id");
      const invoiceUrl =
        optionalString(invoiceEntity, "short_url") ??
        optionalString(invoiceEntity, "invoice_url");
      const customerId = optionalString(subscriptionEntity, "customer_id");

      if (
        ["subscription.activated", "subscription.charged"].includes(event)
      ) {
        if (
          ![
            SubscriptionStatus.CANCELLED,
            SubscriptionStatus.EXPIRED,
          ].includes(localSubscription.status)
        ) {
          const previousRazorpaySubscriptionId =
            organization.razorpaySubscriptionId;
          if (
            previousRazorpaySubscriptionId &&
            previousRazorpaySubscriptionId !== razorpaySubscriptionId
          ) {
            await billingService.cancelSubscriptionIfActive(
              previousRazorpaySubscriptionId,
            );
          }
          const session = await mongoose.startSession();
          try {
            await session.withTransaction(async () => {
              const updated =
                await organisationRepository.updateSubscriptionByRazorpayId(
                  organizationId,
                  razorpaySubscriptionId,
                  {
                    status: SubscriptionStatus.ACTIVE,
                    startDate: new Date(),
                    ...(paymentId ? { razorpayPaymentId: paymentId } : {}),
                    ...(invoiceUrl ? { invoiceUrl } : {}),
                  },
                  session,
                );
              if (!updated) {
                throw new ApiError(404, "Subscription record not found");
              }
              await organisationRepository.expireOtherSubscriptions(
                organizationId,
                updated.id,
                session,
              );
              await organisationRepository.updateOrganization(
                organizationId,
                {
                  subscriptionPlan: updated.plan,
                  subscriptionStatus: SubscriptionStatus.ACTIVE,
                  planLimits: { ...PLAN_LIMITS[updated.plan] },
                  razorpaySubscriptionId,
                  ...(customerId ? { razorpayCustomerId: customerId } : {}),
                },
                session,
              );
            });
          } finally {
            await session.endSession();
          }
        }
      } else if (
        [
          "subscription.cancelled",
          "subscription.completed",
          "subscription.expired",
          "subscription.halted",
        ].includes(event)
      ) {
        const terminalStatus =
          event === "subscription.cancelled"
            ? SubscriptionStatus.CANCELLED
            : SubscriptionStatus.EXPIRED;
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            await organisationRepository.updateSubscriptionByRazorpayId(
              organizationId,
              razorpaySubscriptionId,
              {
                status: terminalStatus,
                endDate: new Date(),
                ...(paymentId ? { razorpayPaymentId: paymentId } : {}),
                ...(invoiceUrl ? { invoiceUrl } : {}),
              },
              session,
            );
            if (
              organization.razorpaySubscriptionId ===
              razorpaySubscriptionId
            ) {
              const freeSubscription =
                await organisationRepository.findActiveFreeSubscription(
                  organizationId,
                  session,
                );
              if (!freeSubscription) {
                await organisationRepository.createSubscription(
                  {
                    organizationId,
                    plan: SubscriptionPlan.FREE,
                    status: SubscriptionStatus.ACTIVE,
                    startDate: new Date(),
                    amount: 0,
                    currency: "INR",
                  },
                  session,
                );
              }
              await organisationRepository.updateOrganization(
                organizationId,
                {
                  $set: {
                    subscriptionPlan: SubscriptionPlan.FREE,
                    subscriptionStatus: SubscriptionStatus.ACTIVE,
                    planLimits: { ...PLAN_LIMITS[SubscriptionPlan.FREE] },
                  },
                  $unset: { razorpaySubscriptionId: 1 },
                },
                session,
              );
            }
          });
        } finally {
          await session.endSession();
        }
      } else {
        return { duplicate: false, handled: false };
      }

      await organizationContextService.invalidate(organizationId);
      if (idempotencyKey) {
        try {
          await redisClient.set(idempotencyKey, "done", "EX", 604800);
        } catch {
          // Processing remains valid even if the idempotency marker fails.
        }
      }
      return { duplicate: false, handled: true };
    } catch (error) {
      if (idempotencyKey) {
        try {
          await redisClient.del(idempotencyKey);
        } catch {
          // Best-effort cleanup allows Razorpay to retry.
        }
      }
      throw error;
    }
  }

  createDepartment(actor: AuthUser, data: Record<string, unknown>) {
    return organisationRepository.createDepartment(
      this.organizationId(actor, data.organizationId as string | undefined),
      data,
    );
  }

  listDepartments(actor: AuthUser, organizationId?: string) {
    return organisationRepository.listDepartments(
      this.organizationId(actor, organizationId),
    );
  }

  updateDepartment(actor: AuthUser, id: string, data: Record<string, unknown>) {
    return organisationRepository.updateDepartment(
      this.organizationId(actor),
      id,
      data,
    );
  }

  createWarehouse(actor: AuthUser, data: Record<string, unknown>) {
    return organisationRepository.createWarehouse(
      this.organizationId(actor, data.organizationId as string | undefined),
      data,
    );
  }

  listWarehouses(actor: AuthUser, organizationId?: string) {
    return organisationRepository.listWarehouses(
      this.organizationId(actor, organizationId),
    );
  }

  updateWarehouse(actor: AuthUser, id: string, data: Record<string, unknown>) {
    return organisationRepository.updateWarehouse(
      this.organizationId(actor),
      id,
      data,
    );
  }

  createCategory(actor: AuthUser, data: Record<string, unknown>) {
    return organisationRepository.createCategory(
      this.organizationId(actor, data.organizationId as string | undefined),
      data,
    );
  }

  listCategories(actor: AuthUser, organizationId?: string) {
    return organisationRepository.listCategories(
      this.organizationId(actor, organizationId),
    );
  }

  updateCategory(actor: AuthUser, id: string, data: Record<string, unknown>) {
    return organisationRepository.updateCategory(
      this.organizationId(actor),
      id,
      data,
    );
  }
}

export const organisationService = new OrganisationService();
