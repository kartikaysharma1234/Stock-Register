import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export const hashPassword = (value: string) => bcrypt.hash(value, SALT_ROUNDS);

export const comparePassword = (value: string, hash: string) =>
  bcrypt.compare(value, hash);

export const generateSecureToken = () => randomBytes(32).toString("hex");

export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
