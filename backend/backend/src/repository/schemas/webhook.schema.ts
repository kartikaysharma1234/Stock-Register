import { Schema, Types, model } from "mongoose";
import {
  WebhookDeliveryStatus,
  WebhookEvent,
} from "../../constants";

export interface IWebhookEndpoint {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  url: string;
  description?: string;
  events: WebhookEvent[];
  secretEncrypted: string;
  secretLast4: string;
  headers: Record<string, string>;
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  lastTriggeredAt?: Date;
  failureCount: number;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWebhookDelivery {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  webhookId: Types.ObjectId;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  attempt: number;
  maxAttempts: number;
  nextAttemptAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  requestHeaders: Record<string, string>;
  responseStatus?: number;
  responseBody?: string;
  errorMessage?: string;
  durationMs?: number;
  createdAt: Date;
  updatedAt: Date;
}

const headersSchema = {
  type: Map,
  of: String,
  default: {},
};

const webhookEndpointSchema = new Schema<IWebhookEndpoint>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    url: { type: String, required: true, trim: true, maxlength: 1000 },
    description: { type: String, trim: true, maxlength: 1000 },
    events: {
      type: [{ type: String, enum: Object.values(WebhookEvent) }],
      required: true,
      validate: [
        (value: WebhookEvent[]) => value.length > 0,
        "At least one event is required",
      ],
    },
    secretEncrypted: { type: String, required: true, select: false },
    secretLast4: { type: String, required: true, trim: true, maxlength: 4 },
    headers: headersSchema,
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    lastTriggeredAt: Date,
    failureCount: { type: Number, default: 0, min: 0 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

const webhookDeliverySchema = new Schema<IWebhookDelivery>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    webhookId: {
      type: Schema.Types.ObjectId,
      ref: "WebhookEndpoint",
      required: true,
      index: true,
    },
    event: {
      type: String,
      enum: Object.values(WebhookEvent),
      required: true,
      index: true,
    },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: Object.values(WebhookDeliveryStatus),
      default: WebhookDeliveryStatus.PENDING,
      index: true,
    },
    attempt: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 5, min: 1, max: 10 },
    nextAttemptAt: { type: Date, index: true },
    deliveredAt: Date,
    failedAt: Date,
    requestHeaders: headersSchema,
    responseStatus: { type: Number, min: 100, max: 599 },
    responseBody: { type: String, trim: true, maxlength: 5000 },
    errorMessage: { type: String, trim: true, maxlength: 1000 },
    durationMs: { type: Number, min: 0 },
  },
  { timestamps: true, versionKey: false },
);

webhookEndpointSchema.index(
  { organizationId: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
webhookEndpointSchema.index({ organizationId: 1, isActive: 1, isDeleted: 1 });
webhookEndpointSchema.index({ organizationId: 1, events: 1, isDeleted: 1 });
webhookEndpointSchema.index({ name: "text", description: "text", url: "text" });

webhookDeliverySchema.index({ organizationId: 1, createdAt: -1 });
webhookDeliverySchema.index({ webhookId: 1, createdAt: -1 });
webhookDeliverySchema.index({ webhookId: 1, status: 1, nextAttemptAt: 1 });

export const WebhookEndpointModel = model<IWebhookEndpoint>(
  "WebhookEndpoint",
  webhookEndpointSchema,
);

export const WebhookDeliveryModel = model<IWebhookDelivery>(
  "WebhookDelivery",
  webhookDeliverySchema,
);
