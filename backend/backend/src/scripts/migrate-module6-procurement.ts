import mongoose from "mongoose";
import { config } from "../config";
import {
  GoodsReceivedNoteModel,
  PaymentModel,
  PurchaseOrderModel,
  VendorModel,
} from "../repository/schemas";

const vendorIndexKey = JSON.stringify({ organizationId: 1, code: 1 });
const poIndexKey = JSON.stringify({ organizationId: 1, poNumber: 1 });
const grnIndexKey = JSON.stringify({ organizationId: 1, grnNumber: 1 });

interface CollectionIndex {
  key: Record<string, 1 | -1 | string>;
  name?: string;
  partialFilterExpression?: Record<string, unknown>;
}

const dropLegacyIndex = async (
  indexes: CollectionIndex[],
  key: string,
  drop: (name: string) => Promise<unknown>,
) => {
  const index = indexes.find(
    (entry) =>
      JSON.stringify(entry.key) === key &&
      !entry.partialFilterExpression,
  );
  if (index?.name) await drop(index.name);
};

const migrate = async () => {
  await mongoose.connect(config.mongoUri);

  await VendorModel.updateMany(
    {},
    [
      {
        $set: {
          rating: { $ifNull: ["$rating", 0] },
          totalOrders: { $ifNull: ["$totalOrders", 0] },
          totalAmount: { $ifNull: ["$totalAmount", 0] },
          paymentTerms: { $ifNull: ["$paymentTerms", "net30"] },
          bankDetails: { $ifNull: ["$bankDetails", {}] },
          isActive: { $ifNull: ["$isActive", true] },
          isDeleted: { $ifNull: ["$isDeleted", false] },
          address: {
            $cond: [
              { $eq: [{ $type: "$address" }, "string"] },
              { line1: "$address" },
              { $ifNull: ["$address", {}] },
            ],
          },
        },
      },
    ],
  );

  await PurchaseOrderModel.updateMany(
    {},
    [
      {
        $set: {
          items: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ["$items", []] } }, 0] },
              "$items",
              {
                $map: {
                  input: { $ifNull: ["$lines", []] },
                  as: "line",
                  in: {
                    itemId: "$$line.itemId",
                    variantId: "$$line.variantId",
                    quantity: {
                      $ifNull: ["$$line.quantity", "$$line.orderedQuantity"],
                    },
                    receivedQuantity: {
                      $ifNull: ["$$line.receivedQuantity", 0],
                    },
                    unitCost: {
                      $ifNull: ["$$line.unitCost", "$$line.unitPrice"],
                    },
                    taxRate: { $ifNull: ["$$line.taxRate", 0] },
                    totalCost: {
                      $multiply: [
                        {
                          $ifNull: [
                            "$$line.quantity",
                            "$$line.orderedQuantity",
                          ],
                        },
                        {
                          $ifNull: ["$$line.unitCost", "$$line.unitPrice"],
                        },
                      ],
                    },
                    expectedDeliveryDate: "$$line.expectedDeliveryDate",
                    notes: "$$line.notes",
                  },
                },
              },
            ],
          },
          subTotal: { $ifNull: ["$subTotal", "$subtotal"] },
          taxAmount: { $ifNull: ["$taxAmount", "$taxTotal"] },
          discountAmount: { $ifNull: ["$discountAmount", 0] },
          totalAmount: { $ifNull: ["$totalAmount", "$total"] },
          attachments: { $ifNull: ["$attachments", []] },
          vendorStatsCounted: { $ifNull: ["$vendorStatsCounted", false] },
          isDeleted: { $ifNull: ["$isDeleted", false] },
        },
      },
    ],
  );

  await GoodsReceivedNoteModel.updateMany(
    {},
    [
      {
        $set: {
          items: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ["$items", []] } }, 0] },
              "$items",
              {
                $map: {
                  input: { $ifNull: ["$lines", []] },
                  as: "line",
                  in: {
                    itemId: "$$line.itemId",
                    variantId: "$$line.variantId",
                    orderedQuantity: { $ifNull: ["$$line.orderedQuantity", 0] },
                    receivedQuantity: {
                      $ifNull: ["$$line.receivedQuantity", "$$line.quantity"],
                    },
                    rejectedQuantity: {
                      $ifNull: ["$$line.rejectedQuantity", 0],
                    },
                    batchNumber: "$$line.batchNumber",
                    serialNumbers: { $ifNull: ["$$line.serialNumbers", []] },
                    manufacturingDate: "$$line.manufacturingDate",
                    expiryDate: "$$line.expiryDate",
                    unitCost: { $ifNull: ["$$line.unitCost", 0] },
                    condition: { $ifNull: ["$$line.condition", "good"] },
                  },
                },
              },
            ],
          },
          attachments: { $ifNull: ["$attachments", []] },
          qualityCheckPassed: { $ifNull: ["$qualityCheckPassed", true] },
          isDeleted: { $ifNull: ["$isDeleted", false] },
        },
      },
    ],
  );

  const grnsWithoutVendor = GoodsReceivedNoteModel.find({
    vendorId: { $exists: false },
  }).cursor();
  for await (const grn of grnsWithoutVendor) {
    const purchaseOrder = await PurchaseOrderModel.findById(
      grn.purchaseOrderId,
    ).select("vendorId");
    if (purchaseOrder?.vendorId) {
      grn.vendorId = purchaseOrder.vendorId;
      await grn.save();
    }
  }

  await dropLegacyIndex(
    (await VendorModel.collection.indexes()) as CollectionIndex[],
    vendorIndexKey,
    (name) => VendorModel.collection.dropIndex(name),
  );
  await dropLegacyIndex(
    (await PurchaseOrderModel.collection.indexes()) as CollectionIndex[],
    poIndexKey,
    (name) => PurchaseOrderModel.collection.dropIndex(name),
  );
  await dropLegacyIndex(
    (await GoodsReceivedNoteModel.collection.indexes()) as CollectionIndex[],
    grnIndexKey,
    (name) => GoodsReceivedNoteModel.collection.dropIndex(name),
  );

  await Promise.all([
    VendorModel.createIndexes(),
    PurchaseOrderModel.createIndexes(),
    GoodsReceivedNoteModel.createIndexes(),
    PaymentModel.createIndexes(),
  ]);

  console.log("Module 6 procurement migration completed.");
};

void migrate()
  .catch((error: unknown) => {
    console.error("Module 6 migration failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
