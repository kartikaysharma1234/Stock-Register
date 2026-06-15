import { z } from "zod";
import { StockMovementType } from "../constants/status";
import { dateString, objectId } from "./common.validation";

const itemBody = z.object({
  name: z.string().trim().min(2).max(200),
  sku: z.string().trim().min(1).max(80),
  categoryId: objectId,
  unit: z.string().trim().min(1).max(40),
  description: z.string().max(1000).optional(),
  barcode: z.string().max(150).optional(),
  qrCode: z.string().max(500).optional(),
  minStockThreshold: z.coerce.number().min(0).default(0),
  trackBatches: z.boolean().default(false),
  trackExpiry: z.boolean().default(false),
});

export const createItemValidation = z.object({ body: itemBody });

export const updateItemValidation = z.object({
  params: z.object({ id: objectId }),
  body: itemBody.partial(),
});

export const idValidation = z.object({ params: z.object({ id: objectId }) });

export const itemListValidation = z.object({
  query: z.object({
    search: z.string().max(100).optional(),
    categoryId: objectId.optional(),
    isActive: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  }),
});

export const balanceListValidation = z.object({
  query: z.object({ warehouseId: objectId.optional() }),
});

export const stockChangeValidation = z.object({
  body: z.object({
    itemId: objectId,
    warehouseId: objectId,
    quantity: z.coerce.number().positive(),
    departmentId: objectId.optional(),
    batchNumber: z.string().trim().min(1).max(100).optional(),
    expiryDate: dateString.transform((value) => new Date(value)).optional(),
    unitCost: z.coerce.number().min(0).optional(),
    referenceType: z.string().max(80).optional(),
    referenceId: objectId.optional(),
    notes: z.string().max(1000).optional(),
  }),
});

export const movementListValidation = z.object({
  query: z.object({
    itemId: objectId.optional(),
    warehouseId: objectId.optional(),
    departmentId: objectId.optional(),
    type: z.nativeEnum(StockMovementType).optional(),
    from: dateString.transform((value) => new Date(value)).optional(),
    to: dateString.transform((value) => new Date(value)).optional(),
  }),
});
