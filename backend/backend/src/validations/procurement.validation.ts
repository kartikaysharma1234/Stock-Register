import { z } from "zod";
import {
  GrnItemCondition,
  PaymentMode,
  PaymentTerm,
  PurchaseOrderStatus,
  SortOrder,
} from "../constants";
import { dateString, objectId, paginationQuery } from "./common.validation";

const lowerString = (value: unknown) =>
  typeof value === "string" ? value.toLowerCase() : value;

const optionalDate = dateString.transform((value) => new Date(value)).optional();

const booleanQuery = z
  .preprocess((value) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  }, z.boolean())
  .optional();

const organizationQuery = {
  organizationId: objectId.optional(),
};

const sortQuery = {
  sortBy: z.string().trim().min(1).max(80).optional(),
  sortOrder: z
    .preprocess(lowerString, z.nativeEnum(SortOrder))
    .default(SortOrder.DESC),
};

const attachmentValidation = z.object({
  name: z.string().trim().min(1).max(150),
  url: z.string().trim().min(1).max(1000),
});

const addressValidation = z.union([
  z.object({
    line1: z.string().trim().max(250).optional(),
    city: z.string().trim().max(120).optional(),
    state: z.string().trim().max(120).optional(),
    pincode: z.string().trim().max(20).optional(),
  }),
  z.string().trim().max(500).transform((line1) => ({ line1 })),
]);

const bankDetailsValidation = z.object({
  accountNo: z.string().trim().max(50).optional(),
  ifsc: z.string().trim().max(20).optional(),
  bankName: z.string().trim().max(150).optional(),
});

const duplicateItemMessage = "Duplicate item and variant lines are not allowed";

const assertUniqueItems = (
  items: Array<{ itemId: string; variantId?: string }>,
  ctx: z.RefinementCtx,
) => {
  const keys = items.map((item) => `${item.itemId}:${item.variantId ?? ""}`);
  if (new Set(keys).size !== keys.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: duplicateItemMessage });
  }
};

const vendorBody = z.object({
  organizationId: objectId.optional(),
  name: z.string().trim().min(2).max(200),
  code: z.string().trim().min(2).max(50),
  contactPerson: z.string().trim().max(150).optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().max(30).optional(),
  address: addressValidation.optional(),
  taxId: z.string().trim().max(80).optional(),
  gstin: z.string().trim().max(20).optional(),
  panNumber: z.string().trim().max(20).optional(),
  bankDetails: bankDetailsValidation.optional(),
  paymentTerms: z
    .preprocess(lowerString, z.nativeEnum(PaymentTerm))
    .optional(),
  isActive: z.boolean().optional(),
});

export const vendorValidation = z.object({ body: vendorBody });

export const updateVendorValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery).default({}),
  body: vendorBody
    .partial()
    .refine((body) => Object.keys(body).length > 0, "Update body is required"),
});

export const vendorIdValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery).default({}),
});

export const vendorListValidation = z.object({
  query: paginationQuery.extend({
    ...organizationQuery,
    search: z.string().trim().max(120).optional(),
    isActive: booleanQuery,
    paymentTerms: z
      .preprocess(lowerString, z.nativeEnum(PaymentTerm))
      .optional(),
    ...sortQuery,
  }),
});

export const vendorCompareValidation = z.object({
  query: z.object({
    ...organizationQuery,
    itemId: objectId.optional(),
    from: optionalDate,
    to: optionalDate,
  }),
});

const purchaseOrderItemValidation = z.object({
  itemId: objectId,
  variantId: objectId.optional(),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  expectedDeliveryDate: optionalDate,
  notes: z.string().trim().max(500).optional(),
});

const legacyPurchaseOrderLineValidation = z
  .object({
    itemId: objectId,
    variantId: objectId.optional(),
    orderedQuantity: z.coerce.number().positive(),
    unitPrice: z.coerce.number().min(0),
    taxRate: z.coerce.number().min(0).max(100).optional(),
    expectedDeliveryDate: optionalDate,
    notes: z.string().trim().max(500).optional(),
  })
  .transform((line) => ({
    itemId: line.itemId,
    variantId: line.variantId,
    quantity: line.orderedQuantity,
    unitCost: line.unitPrice,
    taxRate: line.taxRate,
    expectedDeliveryDate: line.expectedDeliveryDate,
    notes: line.notes,
  }));

const createPurchaseOrderBody = z
  .object({
    organizationId: objectId.optional(),
    vendorId: objectId,
    warehouseId: objectId,
    expectedDeliveryDate: optionalDate,
    discountAmount: z.coerce.number().min(0).optional(),
    notes: z.string().trim().max(1000).optional(),
    attachments: z.array(attachmentValidation).max(20).optional(),
    items: z.array(purchaseOrderItemValidation).min(1).optional(),
    lines: z.array(legacyPurchaseOrderLineValidation).min(1).optional(),
  })
  .superRefine((body, ctx) => {
    if (body.items && body.lines) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use either items or lines, not both",
      });
    }
    const items = body.items ?? body.lines;
    if (!items?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one purchase order item is required",
      });
      return;
    }
    assertUniqueItems(items, ctx);
  })
  .transform(({ lines, ...body }) => ({
    ...body,
    items: body.items ?? lines ?? [],
  }));

export const createPurchaseOrderValidation = z.object({
  body: createPurchaseOrderBody,
});

const updatePurchaseOrderBody = z
  .object({
    organizationId: objectId.optional(),
    vendorId: objectId.optional(),
    warehouseId: objectId.optional(),
    expectedDeliveryDate: optionalDate,
    discountAmount: z.coerce.number().min(0).optional(),
    notes: z.string().trim().max(1000).optional(),
    attachments: z.array(attachmentValidation).max(20).optional(),
    items: z.array(purchaseOrderItemValidation).min(1).optional(),
    lines: z.array(legacyPurchaseOrderLineValidation).min(1).optional(),
  })
  .superRefine((body, ctx) => {
    if (body.items && body.lines) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use either items or lines, not both",
      });
    }
    const items = body.items ?? body.lines;
    if (items) assertUniqueItems(items, ctx);
    if (
      !items &&
      body.vendorId === undefined &&
      body.warehouseId === undefined &&
      body.expectedDeliveryDate === undefined &&
      body.discountAmount === undefined &&
      body.notes === undefined &&
      body.attachments === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Update body is required",
      });
    }
  })
  .transform(({ lines, ...body }) => ({
    ...body,
    items: body.items ?? lines,
  }));

export const updatePurchaseOrderValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery).default({}),
  body: updatePurchaseOrderBody,
});

export const purchaseOrderIdValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery).default({}),
});

export const purchaseOrderListValidation = z.object({
  query: paginationQuery.extend({
    ...organizationQuery,
    search: z.string().trim().max(120).optional(),
    status: z
      .preprocess(lowerString, z.nativeEnum(PurchaseOrderStatus))
      .optional(),
    vendorId: objectId.optional(),
    warehouseId: objectId.optional(),
    from: optionalDate,
    to: optionalDate,
    ...sortQuery,
  }),
});

export const rejectPurchaseOrderValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery).default({}),
  body: z.object({ reason: z.string().trim().min(2).max(1000) }),
});

export const cancelPurchaseOrderValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery).default({}),
  body: z.object({ reason: z.string().trim().max(1000).optional() }).default({}),
});

const grnItemValidation = z.object({
  itemId: objectId,
  variantId: objectId.optional(),
  receivedQuantity: z.coerce.number().min(0),
  rejectedQuantity: z.coerce.number().min(0).optional(),
  batchNumber: z.string().trim().max(100).optional(),
  serialNumbers: z.array(z.string().trim().min(1).max(100)).max(500).optional(),
  manufacturingDate: optionalDate,
  expiryDate: optionalDate,
  unitCost: z.coerce.number().min(0).optional(),
  condition: z
    .preprocess(lowerString, z.nativeEnum(GrnItemCondition))
    .optional(),
});

const legacyGrnLineValidation = z
  .object({
    itemId: objectId,
    variantId: objectId.optional(),
    quantity: z.coerce.number().positive(),
    rejectedQuantity: z.coerce.number().min(0).optional(),
    batchNumber: z.string().trim().max(100).optional(),
    serialNumbers: z.array(z.string().trim().min(1).max(100)).max(500).optional(),
    manufacturingDate: optionalDate,
    expiryDate: optionalDate,
    unitCost: z.coerce.number().min(0).optional(),
    condition: z
      .preprocess(lowerString, z.nativeEnum(GrnItemCondition))
      .optional(),
  })
  .transform((line) => ({
    itemId: line.itemId,
    variantId: line.variantId,
    receivedQuantity: line.quantity,
    rejectedQuantity: line.rejectedQuantity,
    batchNumber: line.batchNumber,
    serialNumbers: line.serialNumbers,
    manufacturingDate: line.manufacturingDate,
    expiryDate: line.expiryDate,
    unitCost: line.unitCost,
    condition: line.condition,
  }));

const createGrnBody = z
  .object({
    deliveryNoteNumber: z.string().trim().max(100).optional(),
    invoiceNumber: z.string().trim().max(100).optional(),
    invoiceDate: optionalDate,
    invoiceAmount: z.coerce.number().min(0).optional(),
    qualityCheckPassed: z.boolean().optional(),
    qualityNotes: z.string().trim().max(1000).optional(),
    notes: z.string().trim().max(1000).optional(),
    attachments: z.array(attachmentValidation).max(20).optional(),
    items: z.array(grnItemValidation).min(1).optional(),
    lines: z.array(legacyGrnLineValidation).min(1).optional(),
  })
  .superRefine((body, ctx) => {
    if (body.items && body.lines) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use either items or lines, not both",
      });
    }
    const items = body.items ?? body.lines;
    if (!items?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one GRN item is required",
      });
      return;
    }
    assertUniqueItems(items, ctx);
    if (
      items.some(
        (item) =>
          item.receivedQuantity <= 0 && (item.rejectedQuantity ?? 0) <= 0,
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each GRN item must have a received or rejected quantity",
      });
    }
  })
  .transform(({ lines, ...body }) => ({
    ...body,
    items: body.items ?? lines ?? [],
  }));

export const createGrnValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery).default({}),
  body: createGrnBody,
});

export const grnListValidation = z.object({
  query: paginationQuery.extend({
    ...organizationQuery,
    purchaseOrderId: objectId.optional(),
    vendorId: objectId.optional(),
    warehouseId: objectId.optional(),
    from: optionalDate,
    to: optionalDate,
    ...sortQuery,
  }),
});

export const grnIdValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery).default({}),
});

const paymentBody = z.object({
  organizationId: objectId.optional(),
  vendorId: objectId,
  purchaseOrderId: objectId.optional(),
  amount: z.coerce.number().positive(),
  paymentDate: dateString.transform((value) => new Date(value)),
  paymentMode: z.preprocess(lowerString, z.nativeEnum(PaymentMode)),
  referenceNumber: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
  attachments: z.array(attachmentValidation).max(20).optional(),
});

export const createPaymentValidation = z.object({ body: paymentBody });
export const paymentValidation = createPaymentValidation;

export const paymentListValidation = z.object({
  query: paginationQuery.extend({
    ...organizationQuery,
    vendorId: objectId.optional(),
    purchaseOrderId: objectId.optional(),
    paymentMode: z.preprocess(lowerString, z.nativeEnum(PaymentMode)).optional(),
    from: optionalDate,
    to: optionalDate,
    ...sortQuery,
  }),
});
