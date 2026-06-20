import {
  CounterType,
  GrnItemCondition,
  PaymentMode,
  PaymentTerm,
  Permission,
  PurchaseOrderStatus,
  ROLE_PERMISSIONS,
  Role,
} from "../constants";
import { formatCounterNumber } from "../repository/counter.repository";
import {
  GoodsReceivedNoteModel,
  PaymentModel,
  PurchaseOrderModel,
  VendorModel,
} from "../repository/schemas";
import {
  createGrnValidation,
  createPaymentValidation,
  createPurchaseOrderValidation,
  purchaseOrderListValidation,
  updatePurchaseOrderValidation,
  vendorValidation,
} from "./procurement.validation";

const organizationId = "507f1f77bcf86cd799439011";
const vendorId = "507f191e810c19729de860ea";
const warehouseId = "507f191e810c19729de860eb";
const itemId = "507f191e810c19729de860ec";
const purchaseOrderId = "507f191e810c19729de860ed";

describe("Module 6 procurement, vendor, GRN, and payment workflow", () => {
  it("defines vendor profile, financial, and soft-delete fields", () => {
    expect(VendorModel.schema.path("contactPerson")).toBeDefined();
    expect(VendorModel.schema.path("address.line1")).toBeDefined();
    expect(VendorModel.schema.path("gstin")).toBeDefined();
    expect(VendorModel.schema.path("panNumber")).toBeDefined();
    expect(VendorModel.schema.path("bankDetails.accountNo")).toBeDefined();
    expect(VendorModel.schema.path("rating")).toBeDefined();
    expect(VendorModel.schema.path("totalOrders")).toBeDefined();
    expect(VendorModel.schema.path("totalAmount")).toBeDefined();
    expect(VendorModel.schema.path("paymentTerms")).toBeDefined();
    expect(VendorModel.schema.path("isDeleted")).toBeDefined();
  });

  it("defines purchase order lifecycle and canonical item fields", () => {
    expect(PurchaseOrderModel.schema.path("items")).toBeDefined();
    expect(PurchaseOrderModel.schema.virtualpath("lines")).toBeDefined();
    expect(PurchaseOrderModel.schema.path("items.quantity")).toBeDefined();
    expect(PurchaseOrderModel.schema.path("items.unitCost")).toBeDefined();
    expect(PurchaseOrderModel.schema.path("items.totalCost")).toBeDefined();
    expect(PurchaseOrderModel.schema.path("subTotal")).toBeDefined();
    expect(PurchaseOrderModel.schema.virtualpath("total")).toBeDefined();
    expect(PurchaseOrderModel.schema.path("sentToVendorAt")).toBeDefined();
    expect(PurchaseOrderModel.schema.path("cancelledAt")).toBeDefined();
    expect(PurchaseOrderModel.schema.path("vendorStatsCounted")).toBeDefined();
  });

  it("defines GRN quality, invoice, and stock receipt fields", () => {
    expect(GoodsReceivedNoteModel.schema.path("vendorId")).toBeDefined();
    expect(GoodsReceivedNoteModel.schema.path("items")).toBeDefined();
    expect(GoodsReceivedNoteModel.schema.virtualpath("lines")).toBeDefined();
    expect(
      GoodsReceivedNoteModel.schema.path("items.receivedQuantity"),
    ).toBeDefined();
    expect(
      GoodsReceivedNoteModel.schema.path("items.rejectedQuantity"),
    ).toBeDefined();
    expect(GoodsReceivedNoteModel.schema.path("invoiceNumber")).toBeDefined();
    expect(
      GoodsReceivedNoteModel.schema.path("qualityCheckPassed"),
    ).toBeDefined();
  });

  it("defines vendor payment records", () => {
    expect(PaymentModel.schema.path("vendorId")).toBeDefined();
    expect(PaymentModel.schema.path("purchaseOrderId")).toBeDefined();
    expect(PaymentModel.schema.path("paymentMode")).toBeDefined();
    expect(PaymentModel.schema.path("referenceNumber")).toBeDefined();
    expect(PaymentModel.schema.path("recordedBy")).toBeDefined();
    expect(PaymentModel.schema.path("isDeleted")).toBeDefined();
  });

  it("formats procurement counters", () => {
    expect(formatCounterNumber(CounterType.PURCHASE_ORDER, 2026, 12)).toBe(
      "PO-2026-0012",
    );
    expect(formatCounterNumber(CounterType.GRN, 2026, 3)).toBe("GRN-2026-0003");
  });

  it("accepts structured vendor and uppercase payment term input", () => {
    const result = vendorValidation.parse({
      body: {
        organizationId,
        name: "Acme Supplies",
        code: "ACME",
        contactPerson: "Asha",
        address: { line1: "42 Market Road", city: "Pune" },
        paymentTerms: "NET30",
      },
    });

    expect(result.body.paymentTerms).toBe(PaymentTerm.NET30);
    expect(result.body.address).toMatchObject({ city: "Pune" });
  });

  it("normalizes canonical and legacy purchase order items", () => {
    const canonical = createPurchaseOrderValidation.parse({
      body: {
        organizationId,
        vendorId,
        warehouseId,
        items: [{ itemId, quantity: "5", unitCost: "10", taxRate: "18" }],
      },
    });
    const legacy = createPurchaseOrderValidation.parse({
      body: {
        organizationId,
        vendorId,
        warehouseId,
        lines: [{ itemId, orderedQuantity: "2", unitPrice: "25" }],
      },
    });

    expect(canonical.body.items[0]).toMatchObject({
      itemId,
      quantity: 5,
      unitCost: 10,
      taxRate: 18,
    });
    expect(legacy.body.items[0]).toMatchObject({
      itemId,
      quantity: 2,
      unitCost: 25,
    });
  });

  it("rejects ambiguous or empty purchase order updates", () => {
    expect(
      createPurchaseOrderValidation.safeParse({
        body: {
          vendorId,
          warehouseId,
          items: [{ itemId, quantity: 1, unitCost: 10 }],
          lines: [{ itemId, orderedQuantity: 1, unitPrice: 10 }],
        },
      }).success,
    ).toBe(false);

    expect(
      updatePurchaseOrderValidation.safeParse({
        params: { id: purchaseOrderId },
        query: {},
        body: {},
      }).success,
    ).toBe(false);
  });

  it("normalizes GRN lines and validates receipt quantities", () => {
    const result = createGrnValidation.parse({
      params: { id: purchaseOrderId },
      query: {},
      body: {
        invoiceNumber: "INV-1",
        lines: [
          {
            itemId,
            quantity: "3",
            rejectedQuantity: "1",
            condition: "PARTIAL",
          },
        ],
      },
    });

    expect(result.body.items[0]).toMatchObject({
      itemId,
      receivedQuantity: 3,
      rejectedQuantity: 1,
      condition: GrnItemCondition.PARTIAL,
    });

    expect(
      createGrnValidation.safeParse({
        params: { id: purchaseOrderId },
        query: {},
        body: { items: [{ itemId, receivedQuantity: 0, rejectedQuantity: 0 }] },
      }).success,
    ).toBe(false);
  });

  it("validates payments and paginated purchase order filters", () => {
    const payment = createPaymentValidation.parse({
      body: {
        organizationId,
        vendorId,
        purchaseOrderId,
        amount: "1000",
        paymentDate: "2026-06-20",
        paymentMode: "BANK_TRANSFER",
      },
    });
    const list = purchaseOrderListValidation.parse({
      query: {
        page: "2",
        limit: "10",
        status: "SENT_TO_VENDOR",
      },
    });

    expect(payment.body.paymentMode).toBe(PaymentMode.BANK_TRANSFER);
    expect(list.query).toMatchObject({
      page: 2,
      limit: 10,
      status: PurchaseOrderStatus.SENT_TO_VENDOR,
      sortOrder: "desc",
    });
  });

  it("maps module permissions to procurement roles", () => {
    expect(ROLE_PERMISSIONS[Role.ADMIN]).toEqual(
      expect.arrayContaining([
        Permission.VENDOR_CREATE,
        Permission.PURCHASE_APPROVE,
        Permission.PAYMENT_CREATE,
      ]),
    );
    expect(ROLE_PERMISSIONS[Role.STORE_MANAGER]).toEqual(
      expect.arrayContaining([
        Permission.PURCHASE_READ,
        Permission.PURCHASE_RECEIVE,
        Permission.GRN_CREATE,
      ]),
    );
    expect(ROLE_PERMISSIONS[Role.VIEWER]).toEqual(
      expect.arrayContaining([
        Permission.VENDOR_READ,
        Permission.PURCHASE_READ,
        Permission.PAYMENT_READ,
      ]),
    );
  });
});
