export const toSlug = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export const organizationCodeFromSlug = (slug: string) => {
  const base = slug.replace(/[^a-z0-9]/gi, "").slice(0, 12).toUpperCase();
  const suffix = createHash("sha1").update(slug).digest("hex").slice(0, 6);
  return `${base}-${suffix}`.toUpperCase();
};
import { createHash } from "crypto";
