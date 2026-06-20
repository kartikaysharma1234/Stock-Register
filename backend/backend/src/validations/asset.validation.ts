import { z } from "zod";
import {
  AssetStatus,
  DepreciationMethod,
  SortOrder,
} from "../constants";
import { dateString, objectId, paginationQuery } from "./common.validation";

const lowerString = (value: unknown) =>
  typeof value === "string" ? value.toLowerCase() : value;

const optionalDate = dateString.transform((value) => new Date(value)).optional();

const organizationQuery = {
  organizationId: objectId.optional(),
};

const sortQuery = {
  sortBy: z.string().trim().min(1).max(80).optional(),
  sortOrder: z
    .preprocess(lowerString, z.nativeEnum(SortOrder))
    .default(SortOrder.DESC),
};

const attachmentValidation = z.string().trim().min(1).max(1000);

const maintenanceScheduleValidation = z
  .object({
    type: z.string().trim().min(1).max(120),
    intervalDays: z.coerce.number().int().positive(),
    lastDone: optionalDate,
    nextDue: optionalDate,
  })
  .refine(
    (schedule) => !schedule.lastDone || !schedule.nextDue || schedule.nextDue > schedule.lastDone,
    "nextDue must be after lastDone",
  );

const assetBaseBody = z.object({
    organizationId: objectId.optional(),
    itemId: objectId,
    name: z.string().trim().min(2).max(200),
    serialNumber: z.string().trim().max(120).optional(),
    barcode: z.string().trim().max(150).optional(),
    category: z.string().trim().max(150).optional(),
    warehouseId: objectId,
    zoneId: objectId.optional(),
    purchaseDate: optionalDate,
    purchaseCost: z.coerce.number().min(0).optional(),
    currentValue: z.coerce.number().min(0).optional(),
    depreciationMethod: z
      .preprocess(lowerString, z.nativeEnum(DepreciationMethod))
      .optional(),
    depreciationRate: z.coerce.number().min(0).max(100).optional(),
    usefulLifeYears: z.coerce.number().min(0).optional(),
    warrantyExpiry: optionalDate,
    insuranceExpiry: optionalDate,
    maintenanceSchedule: z
      .array(maintenanceScheduleValidation)
      .max(50)
      .optional(),
    notes: z.string().trim().max(2000).optional(),
    attachments: z.array(attachmentValidation).max(50).optional(),
  });

const assetBody = assetBaseBody
  .refine(
    (asset) =>
      !asset.purchaseDate ||
      !asset.warrantyExpiry ||
      asset.warrantyExpiry > asset.purchaseDate,
    "warrantyExpiry must be after purchaseDate",
  )
  .refine(
    (asset) =>
      !asset.purchaseDate ||
      !asset.insuranceExpiry ||
      asset.insuranceExpiry > asset.purchaseDate,
    "insuranceExpiry must be after purchaseDate",
  );

export const createAssetValidation = z.object({ body: assetBody });

export const updateAssetValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery).default({}),
  body: assetBaseBody
    .partial()
    .refine(
      (body) => Object.keys(body).length > 0,
      "Update body is required",
    )
    .refine(
      (asset) =>
        !asset.purchaseDate ||
        !asset.warrantyExpiry ||
        asset.warrantyExpiry > asset.purchaseDate,
      "warrantyExpiry must be after purchaseDate",
    )
    .refine(
      (asset) =>
        !asset.purchaseDate ||
        !asset.insuranceExpiry ||
        asset.insuranceExpiry > asset.purchaseDate,
      "insuranceExpiry must be after purchaseDate",
    ),
});

export const assetIdValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery).default({}),
});

export const assetHistoryValidation = z.object({
  params: z.object({ id: objectId }),
  query: paginationQuery.extend({
    ...organizationQuery,
    ...sortQuery,
  }),
});

export const assetListValidation = z.object({
  query: paginationQuery.extend({
    ...organizationQuery,
    search: z.string().trim().max(120).optional(),
    status: z.preprocess(lowerString, z.nativeEnum(AssetStatus)).optional(),
    warehouseId: objectId.optional(),
    assignedTo: objectId.optional(),
    category: z.string().trim().max(150).optional(),
    dueBefore: optionalDate,
    ...sortQuery,
  }),
});

export const dueMaintenanceValidation = z.object({
  query: paginationQuery.extend({
    ...organizationQuery,
    warehouseId: objectId.optional(),
    dueBefore: optionalDate,
    ...sortQuery,
  }),
});

export const assignedAssetValidation = z.object({
  params: z.object({ userId: objectId }),
  query: paginationQuery.extend({
    ...organizationQuery,
    warehouseId: objectId.optional(),
    status: z.preprocess(lowerString, z.nativeEnum(AssetStatus)).optional(),
    ...sortQuery,
  }),
});

export const assignAssetValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery).default({}),
  body: z
    .object({
      assignedTo: objectId,
      expectedReturnDate: optionalDate,
      notes: z.string().trim().max(2000).optional(),
    })
    .refine(
      (body) =>
        !body.expectedReturnDate || body.expectedReturnDate > new Date(),
      "expectedReturnDate must be in the future",
    ),
});

export const returnAssetValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery).default({}),
  body: z.object({ notes: z.string().trim().max(2000).optional() }).default({}),
});

export const maintenanceAssetValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery).default({}),
  body: z
    .object({
      maintenanceType: z.string().trim().min(1).max(120).optional(),
      intervalDays: z.coerce.number().int().positive().optional(),
      completed: z.boolean().optional(),
      nextDue: optionalDate,
      cost: z.coerce.number().min(0).optional(),
      notes: z.string().trim().max(2000).optional(),
    })
    .refine(
      (body) => !body.nextDue || body.nextDue > new Date(),
      "nextDue must be in the future",
    )
    .refine(
      (body) => !body.intervalDays || body.maintenanceType,
      "maintenanceType is required when intervalDays is provided",
    ),
});

export const disposeAssetValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery).default({}),
  body: z.object({ notes: z.string().trim().max(2000).optional() }).default({}),
});
