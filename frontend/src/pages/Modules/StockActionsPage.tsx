import { ArrowRightLeft, ClipboardCheck } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { PrimaryButton } from "../../components/common/Buttons";
import { PageHeader } from "../../components/common/PageHeader";
import { getRoute, request } from "../../service";
import { buildPayload, errorMessage, type FormState, type FormValue } from "./dataUtils";
import { FieldRenderer, initialFormState } from "./FieldRenderer";
import type { FieldConfig } from "./moduleTypes";

interface StockActionsPageProps {
  kind: "transfer" | "reconcile";
}

const transferFields: FieldConfig[] = [
  { name: "itemId", label: "Item ID", required: true },
  { name: "fromWarehouseId", label: "From warehouse ID", required: true },
  { name: "toWarehouseId", label: "To warehouse ID", required: true },
  { name: "quantity", label: "Quantity", type: "number", required: true },
  { name: "reason", label: "Reason", type: "textarea" },
];

const reconcileFields: FieldConfig[] = [
  { name: "lines", label: "Reconciliation lines JSON", type: "json", required: true, helper: "[{\"itemId\":\"...\",\"warehouseId\":\"...\",\"actualQuantity\":10}]" },
  { name: "notes", label: "Notes", type: "textarea" },
];

export const StockActionsPage = ({ kind }: StockActionsPageProps) => {
  const fields = kind === "transfer" ? transferFields : reconcileFields;
  const [form, setForm] = useState<FormState>(() => initialFormState(fields));
  const [loading, setLoading] = useState(false);
  const jsonFields = useMemo(
    () => fields.filter((field) => field.type === "json").map((field) => field.name),
    [fields],
  );
  const numberFields = useMemo(
    () => fields.filter((field) => field.type === "number").map((field) => field.name),
    [fields],
  );

  const submit = async () => {
    setLoading(true);
    try {
      await request<unknown>(getRoute(kind === "transfer" ? "stock.transfer" : "stock.reconcile"), {
        data: buildPayload(form, jsonFields, numberFields),
      });
      toast.success(kind === "transfer" ? "Stock transfer created" : "Stock reconciled");
    } catch (requestError) {
      toast.error(errorMessage(requestError, "Stock action failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        subtitle={kind === "transfer" ? "Move stock between warehouses or zones." : "Adjust system balances to counted stock."}
        title={kind === "transfer" ? "Stock Transfer" : "Stock Reconcile"}
      >
        <PrimaryButton
          leftIcon={kind === "transfer" ? <ArrowRightLeft className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
          loading={loading}
          onClick={submit}
        >
          Submit
        </PrimaryButton>
      </PageHeader>
      <section className="max-w-3xl rounded-md border border-app-border bg-app-surface p-4">
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <div
              className={field.type === "textarea" || field.type === "json" ? "md:col-span-2" : ""}
              key={field.name}
            >
              <FieldRenderer
                field={field}
                onChange={(name, value: FormValue) =>
                  setForm((current) => ({ ...current, [name]: value }))
                }
                value={form[field.name]}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
