import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "crypto";
import { config } from "../config";
import {
  AuditModule,
  Role,
  WebhookDeliveryStatus,
  WebhookEvent,
} from "../constants";
import { webhookQueue } from "../queue/webhook.queue";
import {
  WebhookDeliveryListFilter,
  WebhookListFilter,
  webhookRepository,
} from "../repository/webhook.repository";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { auditService } from "./audit.service";

export interface WebhookInput {
  organizationId?: string;
  name: string;
  url: string;
  description?: string;
  events: WebhookEvent[];
  headers?: Record<string, string>;
  isActive?: boolean;
}

export interface WebhookUpdateInput {
  name?: string;
  url?: string;
  description?: string | null;
  events?: WebhookEvent[];
  headers?: Record<string, string>;
  isActive?: boolean;
}

export interface WebhookEmitInput {
  organizationId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
}

const maxAttempts = 5;

const generateSecret = () => `whsec_${randomBytes(32).toString("hex")}`;

const encryptionKey = () =>
  createHash("sha256").update(config.jwtAccessSecret).digest();

const encryptSecret = (secret: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
};

const decryptSecret = (encrypted: string) => {
  const [ivValue, tagValue, ciphertextValue] = encrypted.split(".");
  if (!ivValue || !tagValue || !ciphertextValue) {
    throw new ApiError(500, "Webhook secret is invalid");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
};

const normalizeEvents = (events: WebhookEvent[]) => [...new Set(events)];

const normalizeHeaders = (headers: Record<string, string> = {}) =>
  Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

const storedHeaders = (headers: Record<string, string>) => {
  if (headers instanceof Map) {
    return Object.fromEntries(headers);
  }
  return headers;
};

const timestamp = () => Math.floor(Date.now() / 1000).toString();

export const signWebhookPayload = (
  secret: string,
  timestampValue: string,
  body: string,
) =>
  createHmac("sha256", secret)
    .update(`${timestampValue}.${body}`)
    .digest("hex");

export class WebhookService {
  private organizationId(actor: AuthUser, requestedOrganizationId?: string) {
    if (actor.role === Role.SUPER_ADMIN) {
      if (!requestedOrganizationId) {
        throw new ApiError(400, "organizationId is required");
      }
      return requestedOrganizationId;
    }
    if (!actor.organizationId) {
      throw new ApiError(400, "Organization context is required");
    }
    if (
      requestedOrganizationId &&
      requestedOrganizationId !== actor.organizationId
    ) {
      throw new ApiError(403, "Cross-organization access is not allowed");
    }
    return actor.organizationId;
  }

  async create(actor: AuthUser, input: WebhookInput) {
    const organizationId = this.organizationId(actor, input.organizationId);
    const secret = generateSecret();
    const webhook = await webhookRepository.create({
      organizationId,
      name: input.name,
      url: input.url,
      description: input.description,
      events: normalizeEvents(input.events),
      headers: normalizeHeaders(input.headers),
      secretEncrypted: encryptSecret(secret),
      secretLast4: secret.slice(-4),
      isActive: input.isActive ?? true,
      createdBy: actor.id,
    });
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "webhook.create",
        module: AuditModule.WEBHOOK,
        entityType: "Webhook",
        entityId: webhook.id,
        after: { name: webhook.name, url: webhook.url, events: webhook.events },
      },
    );
    return { webhook, secret };
  }

  list(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    filter: WebhookListFilter = {},
  ) {
    return webhookRepository.list(
      this.organizationId(actor, requestedOrganizationId),
      filter,
    );
  }

  async get(actor: AuthUser, id: string, requestedOrganizationId?: string) {
    const webhook = await webhookRepository.findById(
      this.organizationId(actor, requestedOrganizationId),
      id,
    );
    if (!webhook) throw new ApiError(404, "Webhook not found");
    return webhook;
  }

  async update(
    actor: AuthUser,
    id: string,
    input: WebhookUpdateInput,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    const before = await webhookRepository.findById(organizationId, id);
    if (!before) throw new ApiError(404, "Webhook not found");
    const update: Record<string, unknown> = {
      ...input,
      updatedBy: actor.id,
      ...(input.events ? { events: normalizeEvents(input.events) } : {}),
      ...(input.headers ? { headers: normalizeHeaders(input.headers) } : {}),
    };
    if (input.description === null) {
      delete update.description;
      update.$unset = { description: 1 };
    }
    const webhook = await webhookRepository.update(organizationId, id, update);
    if (!webhook) throw new ApiError(404, "Webhook not found");
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "webhook.update",
        module: AuditModule.WEBHOOK,
        entityType: "Webhook",
        entityId: id,
        before: before.toObject(),
        after: webhook.toObject(),
      },
    );
    return webhook;
  }

  async rotateSecret(
    actor: AuthUser,
    id: string,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    const secret = generateSecret();
    const webhook = await webhookRepository.update(organizationId, id, {
      secretEncrypted: encryptSecret(secret),
      secretLast4: secret.slice(-4),
      updatedBy: actor.id,
    });
    if (!webhook) throw new ApiError(404, "Webhook not found");
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "webhook.rotate_secret",
        module: AuditModule.WEBHOOK,
        entityType: "Webhook",
        entityId: id,
        after: { secretLast4: webhook.secretLast4 },
      },
    );
    return { webhook, secret };
  }

  async remove(actor: AuthUser, id: string, requestedOrganizationId?: string) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    const webhook = await webhookRepository.softDelete(
      organizationId,
      id,
      actor.id,
    );
    if (!webhook) throw new ApiError(404, "Webhook not found");
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "webhook.delete",
        module: AuditModule.WEBHOOK,
        entityType: "Webhook",
        entityId: id,
        before: { name: webhook.name, url: webhook.url },
      },
    );
  }

  async deliveries(
    actor: AuthUser,
    id: string,
    requestedOrganizationId: string | undefined,
    filter: WebhookDeliveryListFilter = {},
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    const webhook = await webhookRepository.findById(organizationId, id);
    if (!webhook) throw new ApiError(404, "Webhook not found");
    return webhookRepository.deliveries(organizationId, id, filter);
  }

  async emit(input: WebhookEmitInput) {
    const webhooks = await webhookRepository.activeForEvent(
      input.organizationId,
      input.event,
    );
    const deliveries = await Promise.all(
      webhooks.map(async (webhook) => {
        const delivery = await webhookRepository.createDelivery({
          organizationId: input.organizationId,
          webhookId: webhook.id,
          event: input.event,
          payload: input.payload,
          maxAttempts,
        });
        await webhookQueue.add({
          deliveryId: delivery.id,
          webhookId: webhook.id,
          organizationId: input.organizationId,
          event: input.event,
        });
        return delivery;
      }),
    );
    return { queued: deliveries.length, deliveries };
  }

  async test(actor: AuthUser, id: string, requestedOrganizationId?: string) {
    const webhook = await this.get(actor, id, requestedOrganizationId);
    const delivery = await webhookRepository.createDelivery({
      organizationId: webhook.organizationId.toString(),
      webhookId: webhook.id,
      event: WebhookEvent.STOCK_UPDATED,
      payload: {
        test: true,
        webhookId: webhook.id,
        sentAt: new Date().toISOString(),
      },
      maxAttempts,
    });
    await webhookQueue.add({
      deliveryId: delivery.id,
      webhookId: webhook.id,
      organizationId: webhook.organizationId.toString(),
      event: WebhookEvent.STOCK_UPDATED,
    });
    return { deliveryId: delivery.id, status: WebhookDeliveryStatus.PENDING };
  }

  async deliveryPayload(deliveryId: string, webhookId: string) {
    const [delivery, webhook] = await Promise.all([
      webhookRepository.findDelivery(deliveryId),
      webhookRepository.findByIdWithSecret(webhookId),
    ]);
    if (!delivery || !webhook) {
      throw new ApiError(404, "Webhook delivery not found");
    }
    const body = JSON.stringify({
      id: delivery.id,
      event: delivery.event,
      createdAt: delivery.createdAt.toISOString(),
      payload: delivery.payload,
    });
    const sentAt = timestamp();
    const signature = signWebhookPayload(
      decryptSecret(webhook.secretEncrypted),
      sentAt,
      body,
    );
    const requestHeaders = {
      "content-type": "application/json",
      "user-agent": "StockRegister-Webhooks/1.0",
      "x-stock-register-event": delivery.event,
      "x-stock-register-delivery": delivery.id,
      "x-stock-register-timestamp": sentAt,
      "x-stock-register-signature": `sha256=${signature}`,
      ...storedHeaders(webhook.headers),
    };
    return { webhook, delivery, body, requestHeaders };
  }

  async markDeliverySuccess(
    deliveryId: string,
    durationMs: number,
    responseStatus: number,
    responseBody: string,
    requestHeaders: Record<string, string>,
  ) {
    const delivery = await webhookRepository.updateDelivery(deliveryId, {
      status: WebhookDeliveryStatus.SUCCESS,
      deliveredAt: new Date(),
      responseStatus,
      responseBody,
      durationMs,
      requestHeaders,
      $inc: { attempt: 1 },
    });
    if (delivery) {
      await webhookRepository.markEndpointTriggered(delivery.webhookId.toString());
    }
    return delivery;
  }

  async markDeliveryFailure(
    deliveryId: string,
    durationMs: number,
    errorMessage: string,
    requestHeaders: Record<string, string>,
    responseStatus?: number,
    responseBody?: string,
  ) {
    const delivery = await webhookRepository.findDelivery(deliveryId);
    if (!delivery) return undefined;
    const attempt = delivery.attempt + 1;
    const exhausted = attempt >= delivery.maxAttempts;
    const nextAttemptAt = exhausted
      ? undefined
      : new Date(Date.now() + 2 ** attempt * 60_000);
    const updated = await webhookRepository.updateDelivery(deliveryId, {
      status: exhausted
        ? WebhookDeliveryStatus.EXHAUSTED
        : WebhookDeliveryStatus.FAILED,
      attempt,
      failedAt: new Date(),
      nextAttemptAt,
      responseStatus,
      responseBody,
      errorMessage,
      durationMs,
      requestHeaders,
    });
    await webhookRepository.markEndpointFailed(delivery.webhookId.toString());
    if (!exhausted && nextAttemptAt) {
      await webhookQueue.add(
        {
          deliveryId: delivery.id,
          webhookId: delivery.webhookId.toString(),
          organizationId: delivery.organizationId.toString(),
          event: delivery.event,
        },
        { delay: Math.max(0, nextAttemptAt.getTime() - Date.now()) },
      );
    }
    return updated;
  }
}

export const webhookService = new WebhookService();
