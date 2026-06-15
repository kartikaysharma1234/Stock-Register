import { z } from "zod";
import {
  RequestPriority,
  RequestStatus,
} from "../constants";
import { dateString, objectId } from "./common.validation";

const organizationQuery = {
  organizationId: objectId.optional(),
};

const pagination = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const requestItem = z.object({
  itemId: objectId,
  variantId: objectId.optional(),
  quantity: z.coerce.number().positive(),
  notes: z.string().trim().max(500).optional(),
});

const legacyRequestLine = z.object({
  itemId: objectId,
  variantId: objectId.optional(),
  requestedQuantity: z.coerce.number().positive(),
  notes: z.string().trim().max(500).optional(),
});

const normalizeItems = <
  T extends {
    items?: z.infer<typeof requestItem>[];
    lines?: z.infer<typeof legacyRequestLine>[];
  },
>(
  data: T,
) => {
  const { lines, ...rest } = data;
  return {
    ...rest,
    items:
      data.items ??
      lines?.map((line) => ({
        itemId: line.itemId,
        variantId: line.variantId,
        quantity: line.requestedQuantity,
        notes: line.notes,
      })),
  };
};

const requestBodyFields = {
  departmentId: objectId,
  warehouseId: objectId,
  items: z.array(requestItem).min(1).max(200).optional(),
  lines: z.array(legacyRequestLine).min(1).max(200).optional(),
  priority: z.nativeEnum(RequestPriority).optional(),
  requiredByDate: dateString.transform((value) => new Date(value)).optional(),
  notes: z.string().trim().max(2000).optional(),
  purpose: z.string().trim().max(2000).optional(),
};

export const createRequestValidation = z.object({
  body: z
    .object({
      organizationId: objectId.optional(),
      ...requestBodyFields,
    })
    .refine((data) => Boolean(data.items?.length || data.lines?.length), {
      message: "At least one request item is required",
      path: ["items"],
    })
    .refine((data) => !(data.items?.length && data.lines?.length), {
      message: "Use either items or lines, not both",
      path: ["items"],
    })
    .transform((data) => {
      const normalized = normalizeItems(data);
      return {
        ...normalized,
        notes: normalized.notes ?? normalized.purpose,
      };
    }),
});

export const updateRequestValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery),
  body: z
    .object({
      departmentId: objectId.optional(),
      warehouseId: objectId.optional(),
      items: z.array(requestItem).min(1).max(200).optional(),
      lines: z.array(legacyRequestLine).min(1).max(200).optional(),
      priority: z.nativeEnum(RequestPriority).optional(),
      requiredByDate: dateString
        .transform((value) => new Date(value))
        .nullable()
        .optional(),
      notes: z.string().trim().max(2000).nullable().optional(),
      purpose: z.string().trim().max(2000).nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required",
    })
    .refine((data) => !(data.items?.length && data.lines?.length), {
      message: "Use either items or lines, not both",
      path: ["items"],
    })
    .transform((data) => {
      const normalized = normalizeItems(data);
      return {
        ...normalized,
        notes:
          normalized.notes !== undefined
            ? normalized.notes
            : normalized.purpose,
      };
    }),
});

export const requestIdValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery),
});

export const requestListValidation = z.object({
  query: z
    .object({
      ...organizationQuery,
      ...pagination,
      search: z.string().trim().max(120).optional(),
      status: z.nativeEnum(RequestStatus).optional(),
      priority: z.nativeEnum(RequestPriority).optional(),
      departmentId: objectId.optional(),
      warehouseId: objectId.optional(),
      requestedBy: objectId.optional(),
      requiredFrom: dateString
        .transform((value) => new Date(value))
        .optional(),
      requiredTo: dateString.transform((value) => new Date(value)).optional(),
      sortBy: z
        .enum([
          "createdAt",
          "updatedAt",
          "requestNumber",
          "priority",
          "requiredByDate",
        ])
        .default("createdAt"),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
    })
    .refine(
      (data) =>
        !data.requiredFrom ||
        !data.requiredTo ||
        data.requiredFrom <= data.requiredTo,
      {
        message: "requiredFrom must be before or equal to requiredTo",
        path: ["requiredFrom"],
      },
    ),
});

export const submitRequestValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery),
  body: z.object({
    comments: z.string().trim().max(1000).optional(),
  }),
});

const approvalItem = z.object({
  itemId: objectId,
  variantId: objectId.optional(),
  approvedQuantity: z.coerce.number().min(0),
  rejectionReason: z.string().trim().max(1000).optional(),
});

export const approveRequestValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery),
  body: z.object({
    items: z
      .array(approvalItem)
      .min(1)
      .max(200)
      .refine(
        (items) =>
          new Set(
            items.map(
              (item) => `${item.itemId}:${item.variantId ?? ""}`,
            ),
          ).size === items.length,
        { message: "Approval items must be unique" },
      )
      .optional(),
    comments: z.string().trim().max(1000).optional(),
  }),
});

export const rejectRequestValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery),
  body: z.object({
    reason: z.string().trim().min(2).max(1000),
    comments: z.string().trim().max(1000).optional(),
  }),
});

const fulfillmentItem = z.object({
  itemId: objectId,
  variantId: objectId.optional(),
  quantity: z.coerce.number().positive(),
  batchNumber: z.string().trim().min(1).max(100).optional(),
  serialNumbers: z
    .array(z.string().trim().min(1).max(150))
    .max(1000)
    .refine((values) => new Set(values).size === values.length, {
      message: "Serial numbers must be unique",
    })
    .optional(),
});

export const fulfillRequestValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery),
  body: z.object({
    items: z
      .array(fulfillmentItem)
      .min(1)
      .max(200)
      .refine(
        (items) =>
          new Set(
            items.map(
              (item) => `${item.itemId}:${item.variantId ?? ""}`,
            ),
          ).size === items.length,
        { message: "Fulfillment items must be unique" },
      )
      .optional(),
    comments: z.string().trim().max(1000).optional(),
  }),
});

export const cancelRequestValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery),
  body: z.object({
    comments: z.string().trim().max(1000).optional(),
  }),
});

export const overrideRequestValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery),
  body: z.object({
    status: z.enum([
      RequestStatus.DEPT_APPROVED,
      RequestStatus.STORE_APPROVED,
      RequestStatus.APPROVED,
      RequestStatus.REJECTED,
      RequestStatus.FULFILLED,
      RequestStatus.CANCELLED,
    ]),
    reason: z.string().trim().min(2).max(1000).optional(),
  }),
});
