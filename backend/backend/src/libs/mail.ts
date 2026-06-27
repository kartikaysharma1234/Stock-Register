import nodemailer from "nodemailer";
import { config } from "../config";
import { logger } from "../utils/logger";

const implicitSsl = config.smtp.secure || config.smtp.port === 465;

const fromAddress = () => {
  const match = config.mailFrom.match(/<([^>]+)>$/);
  return match?.[1] ?? config.mailFrom;
};

const sender = (fromName?: string) =>
  fromName
    ? `"${fromName.replaceAll('"', "")}" <${fromAddress()}>`
    : config.mailFrom;

const htmlToText = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

logger.info("SMTP transport configured", {
  host: config.smtp.host,
  port: config.smtp.port,
  secure: implicitSsl,
  requireTLS: config.smtp.requireTls,
  authUserConfigured: Boolean(config.smtp.user),
  from: config.mailFrom,
  localRedirectTo: config.smtp.defaultToEmail,
});

export const mailTransport = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: implicitSsl,
  requireTLS: config.smtp.requireTls,
  auth:
    config.smtp.user && config.smtp.pass
      ? { user: config.smtp.user, pass: config.smtp.pass }
      : undefined,
});

if (config.nodeEnv !== "test") {
  void mailTransport
    .verify()
    .then(() => logger.info("SMTP verify OK"))
    .catch((error) =>
      logger.error("SMTP verify failed", {
        error,
        host: config.smtp.host,
        port: config.smtp.port,
      }),
    );
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  fromName?: string;
}

export const sendMail = async (options: SendMailOptions) => {
  const actualTo =
    config.deployment === "local" && config.smtp.defaultToEmail
      ? config.smtp.defaultToEmail
      : options.to;

  logger.info("Sending email", {
    to: actualTo,
    originalTo: actualTo === options.to ? undefined : options.to,
    subject: options.subject,
    replyTo: options.replyTo,
  });

  const info = await mailTransport.sendMail({
    from: sender(options.fromName),
    to: actualTo,
    replyTo: options.replyTo,
    subject: options.subject,
    html: options.html,
    text: options.text ?? htmlToText(options.html),
    headers:
      actualTo !== options.to
        ? { "X-Original-To": options.to }
        : undefined,
  });

  logger.info("Email sent", {
    to: actualTo,
    messageId: info.messageId,
    response: info.response,
    accepted: info.accepted,
    rejected: info.rejected,
  });

  if (Array.isArray(info.rejected) && info.rejected.length > 0) {
    throw new Error(`Email rejected for ${info.rejected.join(", ")}`);
  }

  return info;
};
