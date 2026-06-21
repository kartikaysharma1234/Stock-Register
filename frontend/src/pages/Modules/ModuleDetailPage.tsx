import { ArrowLeft, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import { PrimaryButton, SecondaryButton } from "../../components/common/Buttons";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { getRoute, request } from "../../service";
import { errorMessage, formatCell, getRecordId, getValue, normalizeRecord, type ApiRecord } from "./dataUtils";
import type { ActionConfig, ModuleConfig } from "./moduleTypes";

interface ModuleDetailPageProps {
  config: ModuleConfig;
  backTo: string;
}

const ActionButton = ({
  action,
  record,
  onComplete,
}: {
  action: ActionConfig;
  record: ApiRecord;
  onComplete: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const id = getRecordId(record);

  const runAction = async () => {
    if (!id) return;
    setLoading(true);
    try {
      await request<unknown>(getRoute(action.routeKey), {
        params: { id },
        data: action.payload ?? {},
      });
      toast.success(`${action.label} completed`);
      onComplete();
    } catch (requestError) {
      toast.error(errorMessage(requestError, `${action.label} failed`));
    } finally {
      setLoading(false);
    }
  };

  if (action.tone === "danger") {
    return (
      <SecondaryButton className="text-app-error" loading={loading} onClick={runAction}>
        {action.label}
      </SecondaryButton>
    );
  }

  if (action.tone === "primary") {
    return (
      <PrimaryButton loading={loading} onClick={runAction}>
        {action.label}
      </PrimaryButton>
    );
  }

  return (
    <SecondaryButton loading={loading} onClick={runAction}>
      {action.label}
    </SecondaryButton>
  );
};

export const ModuleDetailPage = ({ config, backTo }: ModuleDetailPageProps) => {
  const params = useParams();
  const [record, setRecord] = useState<ApiRecord>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecord = useCallback(async () => {
    if (!config.detailRouteKey) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await request<unknown>(getRoute(config.detailRouteKey), {
        params: { id: params.id ?? "" },
      });
      setRecord(normalizeRecord(payload));
    } catch (requestError) {
      setError(errorMessage(requestError, `Unable to load ${config.title}`));
    } finally {
      setLoading(false);
    }
  }, [config.detailRouteKey, config.title, params.id]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  return (
    <div>
      <PageHeader
        subtitle={config.subtitle}
        title={formatCell(record.name ?? record.title ?? record.requestNumber ?? record.poNumber ?? record.assetTag ?? config.title)}
      >
        <Link to={backTo}>
          <SecondaryButton leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </SecondaryButton>
        </Link>
        <SecondaryButton leftIcon={<RefreshCw className="h-4 w-4" />} onClick={loadRecord}>
          Refresh
        </SecondaryButton>
      </PageHeader>

      {error ? (
        <EmptyState description={error} title="Unable to load record" />
      ) : (
        <section className="rounded-md border border-app-border bg-app-surface">
          <div className="grid gap-px bg-app-border md:grid-cols-2 xl:grid-cols-3">
            {config.columns.map((column) => {
              const value = getValue(record, column.key);
              return (
                <div className="bg-app-surface p-4" key={column.key}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-app-muted">
                    {column.label}
                  </div>
                  <div className="mt-2 text-sm text-app-primary">
                    {loading ? (
                      <span className="block h-4 w-24 animate-pulse rounded bg-gray-100" />
                    ) : column.status ? (
                      <StatusBadge status={formatCell(value).toUpperCase()} />
                    ) : (
                      formatCell(value)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {config.actions?.length ? (
        <section className="mt-4 rounded-md border border-app-border bg-app-surface p-4">
          <div className="mb-3 text-sm font-semibold text-app-primary">Actions</div>
          <div className="flex flex-wrap gap-2">
            {config.actions.map((action) => (
              <ActionButton
                action={action}
                key={action.routeKey}
                onComplete={loadRecord}
                record={record}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};
