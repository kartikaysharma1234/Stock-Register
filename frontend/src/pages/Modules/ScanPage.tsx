import { Search } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { PrimaryButton } from "../../components/common/Buttons";
import { EmptyState } from "../../components/common/EmptyState";
import { FormInput } from "../../components/common/Forms";
import { PageHeader } from "../../components/common/PageHeader";
import { getRoute, request } from "../../service";
import { errorMessage, formatCell, normalizeRecord, type ApiRecord } from "./dataUtils";

export const ScanPage = () => {
  const [code, setCode] = useState("");
  const [record, setRecord] = useState<ApiRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const scan = async () => {
    setLoading(true);
    try {
      const payload = await request<unknown>(getRoute("items.scan"), {
        data: { code, barcode: code, sku: code },
      });
      setRecord(normalizeRecord(payload));
    } catch (requestError) {
      toast.error(errorMessage(requestError, "Scan failed"));
      setRecord(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        subtitle="Enter a barcode, QR value, or SKU to find the matching item."
        title="Barcode Scan"
      >
        <PrimaryButton
          leftIcon={<Search className="h-4 w-4" />}
          loading={loading}
          onClick={scan}
        >
          Scan
        </PrimaryButton>
      </PageHeader>
      <section className="mb-5 max-w-xl rounded-md border border-app-border bg-app-surface p-4">
        <FormInput
          label="Barcode, QR, or SKU"
          onChange={(event) => setCode(event.target.value)}
          value={code}
        />
      </section>
      {record ? (
        <section className="rounded-md border border-app-border bg-app-surface p-4">
          <h2 className="text-sm font-semibold text-app-primary">
            {formatCell(record.name ?? record.sku ?? "Matched item")}
          </h2>
          <pre className="mt-4 overflow-auto rounded-md bg-gray-50 p-3 text-xs text-app-primary">
            {JSON.stringify(record, null, 2)}
          </pre>
        </section>
      ) : (
        <EmptyState
          description="Scan an item to see its master data and stock context."
          title="No item selected"
        />
      )}
    </div>
  );
};
