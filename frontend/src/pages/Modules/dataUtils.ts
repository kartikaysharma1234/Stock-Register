import type { JsonValue } from "../../types";

export type ApiRecord = Record<string, unknown>;
export type FormValue = string | number | boolean | string[] | ApiRecord[];
export type FormState = Record<string, FormValue>;

export const isRecord = (value: unknown): value is ApiRecord =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export const getValue = (record: ApiRecord, path: string): unknown =>
  path.split(".").reduce<unknown>((current, key) => {
    if (!isRecord(current)) return undefined;
    return current[key];
  }, record);

export const getRecordId = (record: ApiRecord) => {
  const id = record.id ?? record._id;
  return typeof id === "string" ? id : "";
};

export const normalizeRows = (payload: unknown): ApiRecord[] => {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];

  const candidates = [
    "items",
    "records",
    "results",
    "docs",
    "data",
    "rows",
    "notifications",
    "users",
    "roles",
    "warehouses",
    "departments",
    "vendors",
    "purchaseOrders",
    "grns",
    "payments",
    "assets",
    "logs",
    "reports",
    "apiKeys",
    "webhooks",
    "deliveries",
    "balances",
    "movements",
    "batches",
    "zones",
    "requests",
  ];

  for (const key of candidates) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isRecord);
  }

  return [];
};

export const normalizeRecord = (payload: unknown): ApiRecord => {
  if (isRecord(payload)) return payload;
  return {};
};

const stringify = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    return value.map((item) => stringify(item)).join(", ");
  }
  if (isRecord(value)) {
    const name = value.name ?? value.title ?? value.email ?? value.code ?? value._id ?? value.id;
    if (typeof name === "string") return name;
    return JSON.stringify(value);
  }
  return String(value);
};

export const formatCell = (value: unknown): string => {
  const text = stringify(value);
  if (text.length > 90) return `${text.slice(0, 87)}...`;
  return text;
};

export const parseJsonField = (value: string): JsonValue | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return JSON.parse(trimmed) as JsonValue;
};

export const buildPayload = (
  form: FormState,
  jsonFields: string[] = [],
  numberFields: string[] = [],
  booleanFields: string[] = [],
) =>
  Object.entries(form).reduce<ApiRecord>((payload, [key, value]) => {
    if (value === "" || value === undefined) return payload;
    if (jsonFields.includes(key) && typeof value === "string") {
      const parsed = parseJsonField(value);
      if (parsed !== undefined) payload[key] = parsed;
      return payload;
    }
    if (numberFields.includes(key)) {
      payload[key] = Number(value);
      return payload;
    }
    if (booleanFields.includes(key)) {
      payload[key] = Boolean(value);
      return payload;
    }
    payload[key] = value;
    return payload;
  }, {});

export const errorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (isRecord(error) && typeof error.message === "string") return error.message;
  return fallback;
};
