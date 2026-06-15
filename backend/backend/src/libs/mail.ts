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
}) =>
  mailTransport.sendMail({
    from: config.mailFrom,
    ...options,
  });
