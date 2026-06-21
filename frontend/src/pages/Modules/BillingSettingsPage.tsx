import { CreditCard, Rocket } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PrimaryButton, SecondaryButton } from "../../components/common/Buttons";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { getRoute, request } from "../../service";
import { errorMessage, formatCell, isRecord, normalizeRecord, type ApiRecord } from "./dataUtils";

export const BillingSettingsPage = () => {
  const [usage, setUsage] = useState<ApiRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsage(normalizeRecord(await request<unknown>(getRoute("organization.usage"))));
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to load billing usage"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upgrade = async (plan: "pro" | "enterprise") => {
    setUpgrading(true);
    try {
      await request<unknown>(getRoute("organization.upgrade"), { data: { plan } });
      toast.success("Upgrade checkout created");
      await load();
    } catch (requestError) {
      toast.error(errorMessage(requestError, "Unable to start upgrade"));
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div>
      <PageHeader
        subtitle="View current plan limits and start a Razorpay upgrade."
        title="Billing"
      >
        <SecondaryButton leftIcon={<CreditCard className="h-4 w-4" />} onClick={load}>
          Refresh
        </SecondaryButton>
      </PageHeader>
      {error ? (
        <EmptyState description={error} title="Billing unavailable" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <section className="rounded-md border border-app-border bg-app-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-app-primary">Current Usage</h2>
              {usage ? <StatusBadge status={formatCell(usage.status).toUpperCase()} /> : null}
            </div>
            {loading ? (
              <div className="mt-4 h-40 animate-pulse rounded-md bg-gray-100" />
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {usage && Object.entries(usage).map(([key, value]) => (
                  <div className="rounded-md border border-app-border p-3" key={key}>
                    <div className="text-xs uppercase tracking-wide text-app-muted">{key}</div>
                    <div className="mt-1 text-sm font-medium text-app-primary">
                      {isRecord(value) ? JSON.stringify(value) : formatCell(value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="rounded-md border border-app-border bg-app-surface p-4">
            <h2 className="text-sm font-semibold text-app-primary">Upgrade Plan</h2>
            <p className="mt-2 text-sm text-app-muted">
              Upgrade when you need more users, warehouses, items, API access, or whitelabel support.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <PrimaryButton
                leftIcon={<Rocket className="h-4 w-4" />}
                loading={upgrading}
                onClick={() => upgrade("pro")}
              >
                Upgrade to Pro
              </PrimaryButton>
              <SecondaryButton loading={upgrading} onClick={() => upgrade("enterprise")}>
                Talk Enterprise
              </SecondaryButton>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
