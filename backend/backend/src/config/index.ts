import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/stock-register"),
  REDIS_URL: z.string().min(1).default("redis://127.0.0.1:6379"),
  JWT_ACCESS_SECRET: z.string().min(16).default("development-access-secret-change-me"),
  JWT_REFRESH_SECRET: z.string().min(16).default("development-refresh-secret-change-me"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  APP_URL: z.string().url().default("http://localhost:3000"),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("Stock Register <no-reply@example.com>"),
  REPORT_OUTPUT_DIR: z.string().default("reports"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_PRO_PLAN_ID: z.string().optional(),
  RAZORPAY_ENTERPRISE_PLAN_ID: z.string().optional(),
  RAZORPAY_PRO_AMOUNT: z.coerce.number().int().nonnegative().default(99900),
  RAZORPAY_ENTERPRISE_AMOUNT: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(499900),
  RAZORPAY_BILLING_CYCLES: z.coerce.number().int().positive().default(12),
});

const env = envSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  mongoUri: env.MONGODB_URI,
  redisUrl: env.REDIS_URL,
  jwtAccessSecret: env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: env.JWT_REFRESH_SECRET,
  jwtAccessTtl: env.JWT_ACCESS_TTL,
  jwtRefreshTtlDays: env.JWT_REFRESH_TTL_DAYS,
  appUrl: env.APP_URL,
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  mailFrom: env.MAIL_FROM,
  reportOutputDir: env.REPORT_OUTPUT_DIR,
  razorpay: {
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
    planIds: {
      pro: env.RAZORPAY_PRO_PLAN_ID,
      enterprise: env.RAZORPAY_ENTERPRISE_PLAN_ID,
    },
    amounts: {
      pro: env.RAZORPAY_PRO_AMOUNT,
      enterprise: env.RAZORPAY_ENTERPRISE_AMOUNT,
    },
    billingCycles: env.RAZORPAY_BILLING_CYCLES,
  },
};
