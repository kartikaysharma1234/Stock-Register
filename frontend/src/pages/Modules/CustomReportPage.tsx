import { Play } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { PrimaryButton } from "../../components/common/Buttons";
import { EmptyState } from "../../components/common/EmptyState";
import { FormTextarea } from "../../components/common/Forms";
import { PageHeader } from "../../components/common/PageHeader";
import { getRoute, request } from "../../service";
import { errorMessage, normalizeRecord } from "./dataUtils";

export const CustomReportPage = () => {
  const [body, setBody] = useState("{\n  \"kind\": \"stock-status\",\n  \"format\": \"xlsx\",\n  \"filters\": {}\n}");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const run = async () => {
    setLoading(true);
    try {
      const payload = await request<unknown>(getRoute("reports.export"), {
        data: JSON.parse(body) as Record<string, unknown>,
      });
      setResult(JSON.stringify(normalizeRecord(payload), null, 2));
      toast.success("Custom export queued");
    } catch (requestError) {
      toast.error(errorMessage(requestError, "Custom report failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        subtitle="Send a custom report export payload to the backend."
        title="Custom Report"
      >
        <PrimaryButton leftIcon={<Play className="h-4 w-4" />} loading={loading} onClick={run}>
          Run
        </PrimaryButton>
      </PageHeader>
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-md border border-app-border bg-app-surface p-4">
          <FormTextarea
            label="Export payload JSON"
            onChange={(event) => setBody(event.target.value)}
            rows={18}
            value={body}
          />
        </div>
        {result ? (
          <pre className="overflow-auto rounded-md border border-app-border bg-app-surface p-4 text-xs">
            {result}
          </pre>
        ) : (
          <EmptyState
            description="Run a payload to see the queued report response."
            title="No custom report result"
          />
        )}
      </section>
    </div>
  );
};
