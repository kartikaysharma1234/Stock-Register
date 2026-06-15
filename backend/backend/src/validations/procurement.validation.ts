import { z } from "zod";
import { PurchaseOrderStatus } from "../constants/status";
import { dateString, objectId } from "./common.validation";

export const vendorValidation = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(200),
    code: z.string().trim().min(2).max(50),
    email: z.string().email().optional(),
    phone: z.string().max(30).optional(),
    address: z.string().max(500).optional(),
    taxId: z.string().max(80).optional(),
  }),
});

export const updateVendorValidation = z.object({
  params: z.object({ id: objectId }),
  body: vendorValidation.shape.body.partial(),
});

export const createPurchaseOrderValidation = z.object({
  body: z.object({
    vendorId: objectId,
    warehouseId: objectId,
    expectedDeliveryDate: dateString
      .transform((value) => new Date(value))
      .optional(),
    notes: z.string().max(1000).optional(),
    lines: z
      .array(
        z.object({
          itemId: objectId,
          orderedQuantity: z.coerce.number().positive(),
          unitPrice: z.coerce.number().min(0),
          taxRate: z.coerce.number().min(0).max(100).optional(),
        }),
      )
      .min(1),
  }),
});

export const purchaseOrderIdValidation = z.object({
  params: z.object({ id: objectId }),
});

export const purchaseOrderListValidation = z.object({
  query: z.object({ status: z.nativeEnum(PurchaseOrderStatus).optional() }),
});

export const rejectPurchaseOrderValidation = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ reason: z.string().trim().min(2).max(1000) }),
});

export const createGrnValidation = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    deliveryNoteNumber: z.string().max(100).optional(),
    notes: z.string().max(1000).optional(),
    lines: z
      .array(
        z.object({
          itemId: objectId,
          quantity: z.coerce.number().positive(),
          batchNumber: z.string().max(100).optional(),
          expiryDate: dateString
            .transform((value) => new Date(value))
            .optional(),
          unitCost: z.coerce.number().min(0).optional(),
        }),
      )
      .min(1),
  }),
});
