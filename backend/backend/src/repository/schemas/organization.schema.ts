import { Schema, model, Types } from "mongoose";
import {
  PLAN_LIMITS,
  PlanLimits,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../../constants";

export interface IAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export interface IOrganization {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  code: string;
  logo?: string;
  address?: IAddress;
  gstin?: string;
  email?: string;
  phone?: string;
  billingEmail: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  planLimits: PlanLimits;
  razorpayCustomerId?: string;
  razorpaySubscriptionId?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    country: { type: String, trim: true, default: "India" },
  },
  { _id: false },
);

const planLimitsSchema = new Schema<PlanLimits>(
  {
    maxUsers: {
      type: Number,
      default: PLAN_LIMITS[SubscriptionPlan.FREE].maxUsers,
    },
    maxWarehouses: {
      type: Number,
      default: PLAN_LIMITS[SubscriptionPlan.FREE].maxWarehouses,
    },
    maxItems: {
      type: Number,
      default: PLAN_LIMITS[SubscriptionPlan.FREE].maxItems,
    },
    apiAccess: { type: Boolean, default: false },
    whitelabel: { type: Boolean, default: false },
    requestsPerMinute: {
      type: Number,
      default: PLAN_LIMITS[SubscriptionPlan.FREE].requestsPerMinute,
    },
  },
  { _id: false },
);

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    logo: { type: String, trim: true },
    address: addressSchema,
    gstin: { type: String, trim: true, uppercase: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    billingEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    subscriptionPlan: {
      type: String,
      enum: Object.values(SubscriptionPlan),
      default: SubscriptionPlan.FREE,
      index: true,
    },
    subscriptionStatus: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.ACTIVE,
      index: true,
    },
    planLimits: {
      type: planLimitsSchema,
      required: true,
      default: () => ({ ...PLAN_LIMITS[SubscriptionPlan.FREE] }),
    },
    razorpayCustomerId: { type: String, index: true, sparse: true },
    razorpaySubscriptionId: { type: String, index: true, sparse: true },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

organizationSchema.index({ name: "text", slug: "text", code: "text" });
organizationSchema.index({ createdAt: -1 });

export const OrganizationModel = model<IOrganization>(
  "Organization",
  organizationSchema,
);
