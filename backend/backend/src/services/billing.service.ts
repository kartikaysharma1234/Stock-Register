import Razorpay from "razorpay";
import { config } from "../config";
import { SubscriptionPlan } from "../constants";
import { ApiError } from "../utils/api-error";

export interface CreatedBillingSubscription {
  id: string;
  status: string;
  shortUrl: string;
  customerId?: string;
}

export class BillingService {
  private client?: Razorpay;

  private getClient() {
    if (!config.razorpay.keyId || !config.razorpay.keySecret) {
      throw new ApiError(503, "Razorpay billing is not configured");
    }
    this.client ??= new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
    return this.client;
  }

  getPublicKey() {
    if (!config.razorpay.keyId) {
      throw new ApiError(503, "Razorpay billing is not configured");
    }
    return config.razorpay.keyId;
  }

  getPlanId(plan: SubscriptionPlan) {
    const planId =
      plan === SubscriptionPlan.PRO
        ? config.razorpay.planIds.pro
        : plan === SubscriptionPlan.ENTERPRISE
          ? config.razorpay.planIds.enterprise
          : undefined;
    if (!planId) {
      throw new ApiError(503, `Razorpay plan is not configured for ${plan}`);
    }
    return planId;
  }

  getPlanAmount(plan: SubscriptionPlan) {
    if (plan === SubscriptionPlan.PRO) return config.razorpay.amounts.pro;
    if (plan === SubscriptionPlan.ENTERPRISE) {
      return config.razorpay.amounts.enterprise;
    }
    return 0;
  }

  async createSubscription(input: {
    organizationId: string;
    plan: SubscriptionPlan;
    billingEmail: string;
    phone?: string;
  }): Promise<CreatedBillingSubscription> {
    const subscription = await this.getClient().subscriptions.create({
      plan_id: this.getPlanId(input.plan),
      total_count: config.razorpay.billingCycles,
      quantity: 1,
      customer_notify: true,
      notify_info: {
        notify_email: input.billingEmail,
        notify_phone: input.phone,
      },
      notes: {
        organizationId: input.organizationId,
        plan: input.plan,
      },
    });
    return {
      id: subscription.id,
      status: subscription.status,
      shortUrl: subscription.short_url,
      customerId: subscription.customer_id ?? undefined,
    };
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string) {
    if (!config.razorpay.webhookSecret) {
      throw new ApiError(503, "Razorpay webhook secret is not configured");
    }
    return Razorpay.validateWebhookSignature(
      rawBody.toString("utf8"),
      signature,
      config.razorpay.webhookSecret,
    );
  }

  async cancelSubscription(razorpaySubscriptionId: string) {
    await this.getClient().subscriptions.cancel(
      razorpaySubscriptionId,
      false,
    );
  }

  async cancelSubscriptionIfActive(razorpaySubscriptionId: string) {
    const subscription = await this.getClient().subscriptions.fetch(
      razorpaySubscriptionId,
    );
    if (
      [
        "created",
        "authenticated",
        "active",
        "pending",
        "halted",
      ].includes(subscription.status)
    ) {
      await this.cancelSubscription(razorpaySubscriptionId);
    }
  }
}

export const billingService = new BillingService();
