import { access, readFile } from "fs/promises";
import path from "path";

const escapeHtml = (value: string | number) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const compileEmailTemplate = async (
  templateName: string,
  variables: Record<string, string | number>,
) => {
  const compiledPath = path.join(
    __dirname,
    "..",
    "email-templates",
    `${templateName}.html`,
  );
  const sourcePath = path.resolve(
    process.cwd(),
    "src",
    "email-templates",
    `${templateName}.html`,
  );
  const templatePath = await access(compiledPath)
    .then(() => compiledPath)
    .catch(() => sourcePath);
  let source = await readFile(templatePath, "utf8");
  for (const [key, value] of Object.entries(variables)) {
    source = source.replaceAll(`{{${key}}}`, escapeHtml(value));
  }
  return source;
};
