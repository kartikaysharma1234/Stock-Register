import { Schema, model, Types } from "mongoose";
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from "../../constants";

export interface ISubscription {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: Date;
  endDate?: Date;
  amount: number;
  currency: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySubscriptionId?: string;
  invoiceUrl?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: Object.values(SubscriptionPlan),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      required: true,
      index: true,
    },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "INR",
    },
    razorpayOrderId: { type: String, index: true, sparse: true },
    razorpayPaymentId: { type: String, index: true, sparse: true },
    razorpaySubscriptionId: {
      type: String,
      index: true,
      sparse: true,
      unique: true,
    },
    invoiceUrl: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

subscriptionSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
subscriptionSchema.index({ organizationId: 1, plan: 1, createdAt: -1 });

export const SubscriptionModel = model<ISubscription>(
  "Subscription",
  subscriptionSchema,
);
