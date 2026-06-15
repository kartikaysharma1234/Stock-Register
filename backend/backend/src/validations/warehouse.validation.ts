import { z } from "zod";
import { StockMovementType, WarehouseType } from "../constants";
import { dateString, objectId } from "./common.validation";

const code = z
  .string()
  .trim()
  .min(2)
  .max(30)
  .regex(/^[A-Za-z0-9_-]+$/);

const phone = z
  .string()
  .trim()
  .min(7)
  .max(30)
  .regex(/^[+0-9()\s-]+$/, "Invalid phone number");

const address = z.object({
  line1: z.string().trim().max(200).optional(),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(20).optional(),
});

const pagination = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const organizationQuery = {
  organizationId: objectId.optional(),
};

export const warehouseListValidation = z.object({
  query: z.object({
    ...organizationQuery,
    ...pagination,
    search: z.string().trim().max(120).optional(),
    type: z.nativeEnum(WarehouseType).optional(),
    isActive: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    city: z.string().trim().max(100).optional(),
    managerId: objectId.optional(),
    sortBy: z
      .enum(["createdAt", "updatedAt", "name", "code", "type"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export const warehouseCreateValidation = z.object({
  body: z.object({
    organizationId: objectId.optional(),
    name: z.string().trim().min(2).max(150),
    code,
    type: z.nativeEnum(WarehouseType).default(WarehouseType.SECONDARY),
    address: address.optional(),
    managerId: objectId.optional(),
    contactPhone: phone.optional(),
    isActive: z.boolean().optional(),
  }),
});

export const warehouseIdValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery),
});

export const warehouseUpdateValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery),
  body: z
    .object({
      name: z.string().trim().min(2).max(150).optional(),
      code: code.optional(),
      type: z.nativeEnum(WarehouseType).optional(),
      address: address.nullable().optional(),
      managerId: objectId.nullable().optional(),
      contactPhone: phone.nullable().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required",
    }),
});

export const warehouseZoneListValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object({
    ...organizationQuery,
    ...pagination,
    search: z.string().trim().max(120).optional(),
    isActive: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    sortBy: z
      .enum(["createdAt", "updatedAt", "name", "code"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export const warehouseZoneCreateValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery),
  body: z.object({
    name: z.string().trim().min(2).max(120),
    code,
    description: z.string().trim().max(500).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const warehouseZoneUpdateValidation = z.object({
  params: z.object({
    id: objectId,
    zoneId: objectId,
  }),
  query: z.object(organizationQuery),
  body: z
    .object({
      name: z.string().trim().min(2).max(120).optional(),
      code: code.optional(),
      description: z.string().trim().max(500).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required",
    }),
});

export const warehouseStockValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object({
    ...organizationQuery,
    ...pagination,
    search: z.string().trim().max(120).optional(),
    itemId: objectId.optional(),
    sortBy: z.enum(["updatedAt", "quantity", "reservedQuantity"]).default("updatedAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export const warehouseMovementValidation = z.object({
  params: z.object({ id: objectId }),
  query: z
    .object({
      ...organizationQuery,
      ...pagination,
      itemId: objectId.optional(),
      type: z.nativeEnum(StockMovementType).optional(),
      from: dateString.transform((value) => new Date(value)).optional(),
      to: dateString.transform((value) => new Date(value)).optional(),
      sortBy: z.enum(["occurredAt", "createdAt", "quantity"]).default("occurredAt"),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
    })
    .refine(
      (data) => !data.from || !data.to || data.from.getTime() <= data.to.getTime(),
      {
        message: "from must be before or equal to to",
        path: ["from"],
      },
    ),
});
