import { z } from "zod";
import { SubscriptionPlan } from "../constants";
import { objectId } from "./common.validation";

const code = z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9_-]+$/);
const slug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const address = z.object({
  line1: z.string().trim().max(200).optional(),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(100).optional(),
});

const password = z
  .string()
  .min(10)
  .max(128)
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/\d/, "Password must contain a number");

export const organizationRegisterValidation = z.object({
  body: z.object({
    organization: z.object({
      name: z.string().trim().min(2).max(150),
      slug: slug.optional(),
      logo: z.string().url().optional(),
      address: address.optional(),
      gstin: z.string().trim().max(30).optional(),
      billingEmail: z.string().email(),
      phone: z.string().trim().max(30).optional(),
    }),
    admin: z.object({
      name: z.string().trim().min(2).max(100),
      email: z.string().email(),
      password,
    }),
  }),
});

export const organizationValidation = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(150),
    slug: slug.optional(),
    code,
    logo: z.string().url().optional(),
    address: address.optional(),
    gstin: z.string().trim().max(30).optional(),
    billingEmail: z.string().email(),
    email: z.string().email().optional(),
    phone: z.string().max(30).optional(),
  }),
});

export const organizationUpdateValidation = z.object({
  params: z.object({ id: objectId.optional() }),
  body: z.object({
    name: z.string().trim().min(2).max(150).optional(),
    slug: slug.optional(),
    logo: z.string().url().nullable().optional(),
    address: address.optional(),
    gstin: z.string().trim().max(30).nullable().optional(),
    billingEmail: z.string().email().optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().max(30).nullable().optional(),
  }),
});

export const organizationUpgradeValidation = z.object({
  body: z.object({
    plan: z.enum([
      SubscriptionPlan.PRO,
      SubscriptionPlan.ENTERPRISE,
    ]),
  }),
});

export const masterDataValidation = z.object({
  body: z.object({
    organizationId: objectId.optional(),
    name: z.string().trim().min(2).max(150),
    code,
    location: z.string().max(300).optional(),
    description: z.string().max(500).optional(),
    headUserId: objectId.optional(),
    managerUserIds: z.array(objectId).optional(),
  }),
});

export const masterDataUpdateValidation = z.object({
  params: z.object({ id: objectId }),
  body: masterDataValidation.shape.body.partial(),
});
