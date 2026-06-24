import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PrimaryButton, SecondaryButton } from "../../components/common/Buttons";
import {
  FormDatePicker,
  FormInput,
  FormSelect,
  FormTextarea,
} from "../../components/common/Forms";
import { PageHeader } from "../../components/common/PageHeader";
import { getRoute, request } from "../../service";
import {
  errorMessage,
  getRecordId,
  isRecord,
  normalizeRecord,
  type ApiRecord,
} from "./dataUtils";

interface GrnLine {
  itemId: string;
  name: string;
  sku: string;
  orderedQuantity: number;
  previouslyReceived: number;
  receivedQuantity: number;
  rejectedQuantity: number;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  unitCost: number;
  condition: string;
  trackBatches: boolean;
  trackExpiry: boolean;
}

interface GrnHeader {
  deliveryNoteNumber: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  qualityCheckPassed: boolean;
  qualityNotes: string;
  notes: string;
}

const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const textValue = (value: unknown) =>
  typeof value === "string" ? value : "";

const today = () => new Date().toISOString().slice(0, 10);

const buildLines = (purchaseOrder: ApiRecord): GrnLine[] => {
  const items = Array.isArray(purchaseOrder.items)
    ? purchaseOrder.items.filter(isRecord)
    : [];

  return items.map((line, index) => {
    const item = isRecord(line.itemId) ? line.itemId : {};
    const itemId =
      getRecordId(item) ||
      (typeof line.itemId === "string" ? line.itemId : "");
    const orderedQuantity = numberValue(line.quantity);
    const previouslyReceived = numberValue(line.receivedQuantity);

    return {
      itemId,
      name: textValue(item.name) || `Item ${index + 1}`,
      sku: textValue(item.sku),
      orderedQuantity,
      previouslyReceived,
      receivedQuantity: Math.max(0, orderedQuantity - previouslyReceived),
      rejectedQuantity: 0,
      batchNumber: "",
      manufacturingDate: "",
      expiryDate: "",
      unitCost: numberValue(line.unitCost),
      condition: "good",
      trackBatches: Boolean(item.trackBatches),
      trackExpiry: Boolean(item.trackExpiry),
    };
  });
};

export const GrnFormPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [purchaseOrder, setPurchaseOrder] = useState<ApiRecord>({});
  const [lines, setLines] = useState<GrnLine[]>([]);
  const [header, setHeader] = useState<GrnHeader>({
    deliveryNoteNumber: "",
    invoiceNumber: "",
    invoiceDate: today(),
    invoiceAmount: 0,
    qualityCheckPassed: true,
    qualityNotes: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const loadPurchaseOrder = async () => {
      setLoading(true);
      try {
        const payload = await request<unknown>(
          getRoute("purchaseOrders.getById"),
          { params: { id } },
        );
        if (!isCurrent) return;
        const record = normalizeRecord(payload);
        setPurchaseOrder(record);
        setLines(buildLines(record));
        setHeader((current) => ({
          ...current,
          invoiceAmount: numberValue(record.totalAmount),
        }));
      } catch (requestError) {
        toast.error(errorMessage(requestError, "Unable to load purchase order"));
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadPurchaseOrder();
    return () => {
      isCurrent = false;
    };
  }, [id]);

  const updateHeader = <TKey extends keyof GrnHeader>(
    key: TKey,
    value: GrnHeader[TKey],
  ) => {
    setHeader((current) => ({ ...current, [key]: value }));
  };

  const updateLine = <TKey extends keyof GrnLine>(
    index: number,
    key: TKey,
    value: GrnLine[TKey],
  ) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [key]: value } : line,
      ),
    );
  };

  const submit = async () => {
    const receiptLines = lines.filter(
      (line) => line.receivedQuantity > 0 || line.rejectedQuantity > 0,
    );
    if (receiptLines.length === 0) {
      toast.error("Enter a received or rejected quantity");
      return;
    }

    for (const line of receiptLines) {
      const remaining = line.orderedQuantity - line.previouslyReceived;
      if (line.receivedQuantity + line.rejectedQuantity > remaining) {
        toast.error(`${line.name} exceeds the remaining PO quantity`);
        return;
      }
      if (line.receivedQuantity > 0 && line.trackBatches && !line.batchNumber) {
        toast.error(`Batch number is required for ${line.name}`);
        return;
      }
      if (line.receivedQuantity > 0 && line.trackExpiry && !line.expiryDate) {
        toast.error(`Expiry date is required for ${line.name}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await request<unknown>(getRoute("purchaseOrders.createGrn"), {
        params: { id },
        data: {
          deliveryNoteNumber: header.deliveryNoteNumber || undefined,
          invoiceNumber: header.invoiceNumber || undefined,
          invoiceDate: header.invoiceDate || undefined,
          invoiceAmount: header.invoiceAmount,
          qualityCheckPassed: header.qualityCheckPassed,
          qualityNotes: header.qualityNotes || undefined,
          notes: header.notes || undefined,
          items: receiptLines.map((line) => ({
            itemId: line.itemId,
            receivedQuantity: line.receivedQuantity,
            rejectedQuantity: line.rejectedQuantity,
            batchNumber: line.batchNumber || undefined,
            manufacturingDate: line.manufacturingDate || undefined,
            expiryDate: line.expiryDate || undefined,
            unitCost: line.unitCost,
            condition: line.condition,
          })),
        },
      });
      toast.success("Goods received successfully");
      navigate("/grn");
    } catch (requestError) {
      toast.error(errorMessage(requestError, "Unable to create GRN"));
    } finally {
      setSubmitting(false);
    }
  };

  const poNumber = textValue(purchaseOrder.poNumber) || "Purchase Order";

  return (
    <div>
      <PageHeader
        subtitle="Record delivered quantities, inspection results, batch details, and invoice information."
        title={`Receive Goods - ${poNumber}`}
      >
        <Link to={`/purchase-orders/${id}`}>
          <SecondaryButton leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </SecondaryButton>
        </Link>
        <PrimaryButton
          leftIcon={<Save className="h-4 w-4" />}
          loading={submitting}
          onClick={submit}
        >
          Create GRN
        </PrimaryButton>
      </PageHeader>

      <section className="max-w-5xl rounded-md border border-app-border bg-app-surface p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormInput
            label="Delivery note number"
            onChange={(event) =>
              updateHeader("deliveryNoteNumber", event.target.value)
            }
            value={header.deliveryNoteNumber}
          />
          <FormInput
            label="Invoice number"
            onChange={(event) => updateHeader("invoiceNumber", event.target.value)}
            value={header.invoiceNumber}
          />
          <FormDatePicker
            label="Invoice date"
            onChange={(event) => updateHeader("invoiceDate", event.target.value)}
            value={header.invoiceDate}
          />
          <FormInput
            label="Invoice amount"
            min="0"
            onChange={(event) =>
              updateHeader("invoiceAmount", numberValue(event.target.value))
            }
            type="number"
            value={header.invoiceAmount}
          />
          <label className="flex items-center gap-2 rounded-md border border-app-border px-3 py-2 text-sm text-app-primary md:col-span-2">
            <input
              checked={header.qualityCheckPassed}
              className="h-4 w-4 rounded border-app-border text-app-accent"
              onChange={(event) =>
                updateHeader("qualityCheckPassed", event.target.checked)
              }
              type="checkbox"
            />
            Quality check passed
          </label>
          <div className="md:col-span-2">
            <FormTextarea
              label="Quality notes"
              onChange={(event) => updateHeader("qualityNotes", event.target.value)}
              value={header.qualityNotes}
            />
          </div>
        </div>
      </section>

      <div className="mt-6 max-w-5xl space-y-4">
        {loading ? (
          <div className="h-48 animate-pulse rounded-md bg-gray-100" />
        ) : (
          lines.map((line, index) => (
            <section
              className="rounded-md border border-app-border bg-app-surface p-4"
              key={`${line.itemId}-${index}`}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-app-primary">
                    {line.name}
                  </h2>
                  <p className="mt-1 text-xs text-app-muted">
                    {line.sku || "No SKU"} · Ordered {line.orderedQuantity} ·
                    Already received {line.previouslyReceived}
                  </p>
                </div>
                <span className="text-xs text-app-muted">
                  Remaining {line.orderedQuantity - line.previouslyReceived}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <FormInput
                  label="Received quantity"
                  min="0"
                  onChange={(event) =>
                    updateLine(
                      index,
                      "receivedQuantity",
                      numberValue(event.target.value),
                    )
                  }
                  required
                  type="number"
                  value={line.receivedQuantity}
                />
                <FormInput
                  label="Rejected quantity"
                  min="0"
                  onChange={(event) =>
                    updateLine(
                      index,
                      "rejectedQuantity",
                      numberValue(event.target.value),
                    )
                  }
                  type="number"
                  value={line.rejectedQuantity}
                />
                <FormSelect
                  label="Condition"
                  onChange={(event) =>
                    updateLine(index, "condition", event.target.value)
                  }
                  options={[
                    { label: "Good", value: "good" },
                    { label: "Partial", value: "partial" },
                    { label: "Damaged", value: "damaged" },
                  ]}
                  value={line.condition}
                />
                <FormInput
                  label="Batch number"
                  onChange={(event) =>
                    updateLine(index, "batchNumber", event.target.value)
                  }
                  required={line.trackBatches && line.receivedQuantity > 0}
                  value={line.batchNumber}
                />
                <FormDatePicker
                  label="Manufacturing date"
                  onChange={(event) =>
                    updateLine(index, "manufacturingDate", event.target.value)
                  }
                  value={line.manufacturingDate}
                />
                <FormDatePicker
                  label="Expiry date"
                  onChange={(event) =>
                    updateLine(index, "expiryDate", event.target.value)
                  }
                  required={line.trackExpiry && line.receivedQuantity > 0}
                  value={line.expiryDate}
                />
                <FormInput
                  label="Unit cost"
                  min="0"
                  onChange={(event) =>
                    updateLine(index, "unitCost", numberValue(event.target.value))
                  }
                  type="number"
                  value={line.unitCost}
                />
              </div>
            </section>
          ))
        )}
      </div>

      <section className="mt-4 max-w-5xl rounded-md border border-app-border bg-app-surface p-4">
        <FormTextarea
          label="Receipt notes"
          onChange={(event) => updateHeader("notes", event.target.value)}
          value={header.notes}
        />
      </section>
    </div>
  );
};
