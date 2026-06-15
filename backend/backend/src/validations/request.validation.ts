import { z } from "zod";
import { RequestStatus } from "../constants/status";
import { objectId } from "./common.validation";

export const createRequestValidation = z.object({
  body: z.object({
    departmentId: objectId,
    warehouseId: objectId,
    purpose: z.string().max(1000).optional(),
    lines: z
      .array(
        z.object({
          itemId: objectId,
          requestedQuantity: z.coerce.number().positive(),
          notes: z.string().max(500).optional(),
        }),
      )
      .min(1),
  }),
});

export const requestIdValidation = z.object({
  params: z.object({ id: objectId }),
});

export const requestListValidation = z.object({
  query: z.object({ status: z.nativeEnum(RequestStatus).optional() }),
});

export const rejectRequestValidation = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ reason: z.string().trim().min(2).max(1000) }),
});

export const overrideRequestValidation = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.enum([
      RequestStatus.APPROVED,
      RequestStatus.REJECTED,
      RequestStatus.FULFILLED,
    ]),
    reason: z.string().trim().min(2).max(1000).optional(),
  }),
});
