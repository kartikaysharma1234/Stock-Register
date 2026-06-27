import "dotenv/config";
import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" ? undefined : value;

const optionalEnvString = z.preprocess(
  emptyToUndefined,
  z.string().optional(),
);

const optionalEnvUrl = z.preprocess(
  emptyToUndefined,
  z.string().url().optional(),
);

const optionalEnvEmail = z.preprocess(
  emptyToUndefined,
  z.string().email().optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DEPLOYMENT: z.enum(["local", "cloud"]).default("local"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOSTNAME: z.string().min(1).default("localhost"),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/stock-register"),
  REDIS_URL: optionalEnvString,
  REDIS_HOST: z.string().min(1).default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PW: optionalEnvString,
  JWT_ACCESS_SECRET: z.string().min(16).default("development-access-secret-change-me"),
  JWT_REFRESH_SECRET: z.string().min(16).default("development-refresh-secret-change-me"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  APP_URL: optionalEnvUrl,
  FRONTEND_URL: optionalEnvUrl,
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_REQUIRE_TLS: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  SMTP_USER: optionalEnvString,
  SMTP_PASS: optionalEnvString,
  SMTP_DEFAULT_TO_EMAIL: optionalEnvEmail,
  MAIL_FROM: z.string().default("Stock Register <no-reply@example.com>"),
  REPORT_OUTPUT_DIR: z.string().default("reports"),
  RAZORPAY_KEY_ID: optionalEnvString,
  RAZORPAY_KEY_SECRET: optionalEnvString,
  RAZORPAY_WEBHOOK_SECRET: optionalEnvString,
  RAZORPAY_PRO_PLAN_ID: optionalEnvString,
  RAZORPAY_ENTERPRISE_PLAN_ID: optionalEnvString,
  RAZORPAY_PRO_AMOUNT: z.coerce.number().int().nonnegative().default(99900),
  RAZORPAY_ENTERPRISE_AMOUNT: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(499900),
  RAZORPAY_BILLING_CYCLES: z.coerce.number().int().positive().default(12),
  TWILIO_ACCOUNT_SID: optionalEnvString,
  TWILIO_AUTH_TOKEN: optionalEnvString,
  TWILIO_WHATSAPP_FROM: optionalEnvString,
});

const env = envSchema.parse(process.env);

const redisUrl =
  env.REDIS_URL ??
  `redis://${
    env.REDIS_PW ? `:${encodeURIComponent(env.REDIS_PW)}@` : ""
  }${env.REDIS_HOST}:${env.REDIS_PORT}`;

export const config = {
  nodeEnv: env.NODE_ENV,
  deployment: env.DEPLOYMENT,
  port: env.PORT,
  hostname: env.HOSTNAME,
  mongoUri: env.MONGODB_URI,
  redisUrl,
  jwtAccessSecret: env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: env.JWT_REFRESH_SECRET,
  jwtAccessTtl: env.JWT_ACCESS_TTL,
  jwtRefreshTtlDays: env.JWT_REFRESH_TTL_DAYS,
  appUrl: env.APP_URL ?? env.FRONTEND_URL ?? "http://localhost:5173",
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    requireTls:
      env.SMTP_REQUIRE_TLS ??
      (env.DEPLOYMENT === "cloud" && env.SMTP_PORT !== 465),
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    defaultToEmail: env.SMTP_DEFAULT_TO_EMAIL,
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
  twilio: {
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    whatsappFrom: env.TWILIO_WHATSAPP_FROM,
  },
};
