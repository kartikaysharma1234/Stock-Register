import nodemailer from "nodemailer";
import { config } from "../config";

export const mailTransport = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth:
    config.smtp.user && config.smtp.pass
      ? { user: config.smtp.user, pass: config.smtp.pass }
      : undefined,
});

export const sendMail = (options: {
  to: string;
  subject: string;
  html: string;
}) => {
  const actualTo =
    config.deployment === "local" && config.smtp.defaultToEmail
      ? config.smtp.defaultToEmail
      : options.to;

  return mailTransport.sendMail({
    from: config.mailFrom,
    ...options,
    to: actualTo,
    headers:
      actualTo !== options.to
        ? { "X-Original-To": options.to }
        : undefined,
  });
};
