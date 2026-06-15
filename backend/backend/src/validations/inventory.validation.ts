import { z } from "zod";
import {
  ItemUnit,
  StockMovementType,
  StockReferenceType,
  ValuationMethod,
} from "../constants";
import { dateString, objectId } from "./common.validation";

const pagination = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const organizationQuery = {
  organizationId: objectId.optional(),
};

const booleanQuery = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const variant = z.object({
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(80),
  barcode: z.string().trim().min(1).max(150).optional(),
  additionalCost: z.coerce.number().default(0),
});

const bundleComponent = z.object({
  itemId: objectId,
  quantity: z.coerce.number().positive(),
});

const itemFields = {
  name: z.string().trim().min(2).max(200),
  sku: z.string().trim().min(1).max(80),
  categoryId: objectId,
  unit: z.nativeEnum(ItemUnit),
  description: z.string().trim().max(1000).optional(),
  barcode: z.string().trim().min(1).max(150).optional(),
  qrCode: z.string().trim().min(1).max(500).optional(),
  variants: z.array(variant).max(100).optional(),
  isBundled: z.boolean().optional(),
  bundleComponents: z.array(bundleComponent).max(100).optional(),
  minStockThreshold: z.coerce.number().min(0).optional(),
  maxStockThreshold: z.coerce.number().min(0).optional(),
  reorderPoint: z.coerce.number().min(0).optional(),
  reorderQuantity: z.coerce.number().min(0).optional(),
  valuationMethod: z.nativeEnum(ValuationMethod).optional(),
  hsnCode: z.string().trim().max(30).optional(),
  gstRate: z.coerce.number().min(0).max(100).optional(),
  images: z.array(z.string().url()).max(20).optional(),
  isAsset: z.boolean().optional(),
  trackBatches: z.boolean().optional(),
  trackExpiry: z.boolean().optional(),
  isActive: z.boolean().optional(),
};

const validateItemRules = (
  data: {
    minStockThreshold?: number;
    maxStockThreshold?: number;
    trackBatches?: boolean;
    trackExpiry?: boolean;
    isBundled?: boolean;
    bundleComponents?: Array<{ itemId: string; quantity: number }>;
    variants?: Array<{ sku: string; barcode?: string }>;
  },
  context: z.RefinementCtx,
) => {
  if (
    data.maxStockThreshold !== undefined &&
    data.minStockThreshold !== undefined &&
    data.maxStockThreshold < data.minStockThreshold
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "maxStockThreshold must be greater than or equal to minStockThreshold",
      path: ["maxStockThreshold"],
    });
  }
  if (data.trackExpiry && data.trackBatches === false) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Expiry tracking requires batch tracking",
      path: ["trackExpiry"],
    });
  }
  if (data.isBundled && !data.bundleComponents?.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Bundled items require bundle components",
      path: ["bundleComponents"],
    });
  }
  const variantSkus = (data.variants ?? []).map((entry) =>
    entry.sku.toUpperCase(),
  );
  const variantBarcodes = (data.variants ?? [])
    .map((entry) => entry.barcode)
    .filter((value): value is string => Boolean(value));
  if (new Set(variantSkus).size !== variantSkus.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Variant SKUs must be unique",
      path: ["variants"],
    });
  }
  if (new Set(variantBarcodes).size !== variantBarcodes.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Variant barcodes must be unique",
      path: ["variants"],
    });
  }
};

export const createItemValidation = z.object({
  body: z
    .object({
      organizationId: objectId.optional(),
      ...itemFields,
      variants: z.array(variant).max(100).default([]),
      isBundled: z.boolean().default(false),
      bundleComponents: z.array(bundleComponent).max(100).default([]),
      minStockThreshold: z.coerce.number().min(0).default(0),
      reorderPoint: z.coerce.number().min(0).default(0),
      reorderQuantity: z.coerce.number().min(0).default(0),
      valuationMethod: z
        .nativeEnum(ValuationMethod)
        .default(ValuationMethod.WEIGHTED_AVERAGE),
      gstRate: z.coerce.number().min(0).max(100).default(0),
      images: z.array(z.string().url()).max(20).default([]),
      isAsset: z.boolean().default(false),
      trackBatches: z.boolean().default(false),
      trackExpiry: z.boolean().default(false),
      isActive: z.boolean().default(true),
    })
    .superRefine(validateItemRules),
});

export const updateItemValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery),
  body: z
    .object(itemFields)
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required",
    })
    .superRefine(validateItemRules),
});

export const idValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery),
});

export const itemListValidation = z.object({
  query: z.object({
    ...organizationQuery,
    ...pagination,
    search: z.string().trim().max(120).optional(),
    categoryId: objectId.optional(),
    unit: z.nativeEnum(ItemUnit).optional(),
    isActive: booleanQuery.optional(),
    isAsset: booleanQuery.optional(),
    isBundled: booleanQuery.optional(),
    sortBy: z
      .enum(["createdAt", "updatedAt", "name", "sku", "unit"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export const categoryCreateValidation = z.object({
  body: z.object({
    organizationId: objectId.optional(),
    name: z.string().trim().min(2).max(150),
    code: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/),
    parentCategoryId: objectId.optional(),
    description: z.string().trim().max(500).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const categoryUpdateValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery),
  body: z
    .object({
      name: z.string().trim().min(2).max(150).optional(),
      code: z
        .string()
        .trim()
        .min(2)
        .max(30)
        .regex(/^[A-Za-z0-9_-]+$/)
        .optional(),
      parentCategoryId: objectId.nullable().optional(),
      description: z.string().trim().max(500).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required",
    }),
});

export const categoryListValidation = z.object({
  query: z.object({
    ...organizationQuery,
    ...pagination,
    search: z.string().trim().max(120).optional(),
    parentCategoryId: objectId.optional(),
    isActive: booleanQuery.optional(),
    sortBy: z
      .enum(["createdAt", "updatedAt", "name", "code"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export const balanceListValidation = z.object({
  query: z.object({
    ...organizationQuery,
    ...pagination,
    warehouseId: objectId.optional(),
    zoneId: objectId.optional(),
    sortBy: z
      .enum(["updatedAt", "quantity", "availableQuantity", "totalValue"])
      .default("updatedAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export const batchListValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object({
    ...organizationQuery,
    ...pagination,
    warehouseId: objectId.optional(),
    zoneId: objectId.optional(),
    expiringBefore: dateString
      .transform((value) => new Date(value))
      .optional(),
    includeEmpty: booleanQuery.default("false"),
    sortBy: z
      .enum(["createdAt", "receivedAt", "expiryDate", "batchNumber"])
      .default("expiryDate"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
  }),
});

export const itemStockValidation = balanceListValidation.extend({
  params: z.object({ id: objectId }),
});

const serialFields = {
  batchNumber: z.string().trim().min(1).max(100).optional(),
  serialNumbers: z
    .array(z.string().trim().min(1).max(150))
    .max(1000)
    .refine((values) => new Set(values).size === values.length, {
      message: "Serial numbers must be unique",
    })
    .optional(),
  manufacturingDate: dateString
    .transform((value) => new Date(value))
    .optional(),
  expiryDate: dateString.transform((value) => new Date(value)).optional(),
  unitCost: z.coerce.number().min(0).optional(),
};

export const stockChangeValidation = z.object({
  body: z.object({
    organizationId: objectId.optional(),
    itemId: objectId,
    warehouseId: objectId,
    zoneId: objectId.optional(),
    quantity: z.coerce.number().positive(),
    departmentId: objectId.optional(),
    ...serialFields,
    referenceType: z.nativeEnum(StockReferenceType).optional(),
    referenceId: objectId.optional(),
    notes: z.string().trim().max(1000).optional(),
  }),
});

export const stockAdjustmentValidation = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    organizationId: objectId.optional(),
    warehouseId: objectId,
    zoneId: objectId.optional(),
    adjustment: z.coerce.number().refine((value) => value !== 0, {
      message: "adjustment cannot be zero",
    }),
    ...serialFields,
    notes: z.string().trim().min(2).max(1000),
  }),
});

export const stockTransferValidation = z.object({
  body: z
    .object({
      organizationId: objectId.optional(),
      itemId: objectId,
      sourceWarehouseId: objectId,
      sourceZoneId: objectId.optional(),
      destinationWarehouseId: objectId,
      destinationZoneId: objectId.optional(),
      quantity: z.coerce.number().positive(),
      notes: z.string().trim().max(1000).optional(),
    })
    .refine(
      (data) =>
        data.sourceWarehouseId !== data.destinationWarehouseId ||
        data.sourceZoneId !== data.destinationZoneId,
      {
        message: "Source and destination locations must differ",
        path: ["destinationWarehouseId"],
      },
    ),
});

const reconciliationLine = z.object({
  itemId: objectId,
  zoneId: objectId.optional(),
  countedQuantity: z.coerce.number().min(0),
  ...serialFields,
  notes: z.string().trim().max(1000).optional(),
});

export const stockReconciliationValidation = z.object({
  body: z
    .object({
      organizationId: objectId.optional(),
      warehouseId: objectId,
      lines: z.array(reconciliationLine).min(1).max(500),
      notes: z.string().trim().max(1000).optional(),
    })
    .refine(
      (data) => {
        const keys = data.lines.map(
          (line) => `${line.itemId}:${line.zoneId ?? ""}`,
        );
        return new Set(keys).size === keys.length;
      },
      {
        message: "Reconciliation lines must be unique per item and zone",
        path: ["lines"],
      },
    ),
});

export const movementListValidation = z.object({
  query: z
    .object({
      ...organizationQuery,
      ...pagination,
      itemId: objectId.optional(),
      warehouseId: objectId.optional(),
      zoneId: objectId.optional(),
      departmentId: objectId.optional(),
      type: z.nativeEnum(StockMovementType).optional(),
      referenceType: z.nativeEnum(StockReferenceType).optional(),
      from: dateString.transform((value) => new Date(value)).optional(),
      to: dateString.transform((value) => new Date(value)).optional(),
      sortBy: z
        .enum(["occurredAt", "createdAt", "quantity", "totalCost"])
        .default("occurredAt"),
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

export const itemMovementValidation = movementListValidation.extend({
  params: z.object({ id: objectId }),
});

export const deadStockValidation = z.object({
  query: z.object({
    ...organizationQuery,
    ...pagination,
    warehouseId: objectId.optional(),
    days: z.coerce.number().int().min(1).max(3650).default(90),
    sortBy: z.enum(["lastMovementAt", "name"]).default("lastMovementAt"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
  }),
});

export const expiringStockValidation = z.object({
  query: z.object({
    ...organizationQuery,
    ...pagination,
    warehouseId: objectId.optional(),
    days: z.coerce.number().int().min(1).max(365).default(30),
    sortBy: z.enum(["expiryDate", "createdAt"]).default("expiryDate"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
  }),
});

export const scanItemValidation = z.object({
  body: z.object({
    organizationId: objectId.optional(),
    value: z.string().trim().min(1).max(500),
  }),
});
