import { Schema, Types, model } from "mongoose";
import {
  NotificationChannel,
  NotificationType,
} from "../../constants/status";

export interface INotification {
  _id: Types.ObjectId;
  organizationId?: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: Types.ObjectId;
  channels: NotificationChannel[];
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: Date;
  emailSentAt?: Date;
  whatsappSentAt?: Date;
  smsSentAt?: Date;
  slackSentAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationPreferenceEntry {
  type: NotificationType;
  channels: NotificationChannel[];
}

export interface INotificationPreference {
  _id: Types.ObjectId;
  organizationId?: Types.ObjectId;
  userId: Types.ObjectId;
  preferences: INotificationPreferenceEntry[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    referenceType: { type: String, trim: true, maxlength: 100, index: true },
    referenceId: { type: Schema.Types.ObjectId, index: true },
    channels: {
      type: [{ type: String, enum: Object.values(NotificationChannel) }],
      default: [NotificationChannel.IN_APP],
    },
    data: Schema.Types.Mixed,
    isRead: { type: Boolean, default: false, index: true },
    readAt: Date,
    emailSentAt: Date,
    whatsappSentAt: Date,
    smsSentAt: Date,
    slackSentAt: Date,
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

const notificationPreferenceEntrySchema =
  new Schema<INotificationPreferenceEntry>(
    {
      type: {
        type: String,
        enum: Object.values(NotificationType),
        required: true,
      },
      channels: {
        type: [{ type: String, enum: Object.values(NotificationChannel) }],
        default: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      },
    },
    { _id: false },
  );

const notificationPreferenceSchema = new Schema<INotificationPreference>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    preferences: {
      type: [notificationPreferenceEntrySchema],
      default: [],
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ organizationId: 1, type: 1, createdAt: -1 });
notificationSchema.index({
  organizationId: 1,
  referenceType: 1,
  referenceId: 1,
});
notificationSchema.index({ title: "text", message: "text" });

notificationPreferenceSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
notificationPreferenceSchema.index({ organizationId: 1, userId: 1 });

export const NotificationModel = model<INotification>(
  "Notification",
  notificationSchema,
);

export const NotificationPreferenceModel =
  model<INotificationPreference>(
    "NotificationPreference",
    notificationPreferenceSchema,
  );
