import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { PrimaryButton, SecondaryButton } from "../../components/common/Buttons";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { SearchInput } from "../../components/common/SearchInput";
import { StatusBadge } from "../../components/common/StatusBadge";
import { DataTable, type DataTableColumn } from "../../components/common/Table";
import { getRoute, request } from "../../service";
import { errorMessage, formatCell, getRecordId, getValue, normalizeRows, type ApiRecord } from "./dataUtils";
import { FieldRenderer } from "./FieldRenderer";
import type { ModuleConfig } from "./moduleTypes";

interface ModuleListPageProps {
  config: ModuleConfig;
  routeParams?: Record<string, string>;
  forcedQuery?: Record<string, string | number | boolean>;
}

const emptyRouteParams: Record<string, string> = {};
const emptyForcedQuery: Record<string, string | number | boolean> = {};

export const ModuleListPage = ({
  config,
  routeParams = emptyRouteParams,
  forcedQuery = emptyForcedQuery,
}: ModuleListPageProps) => {
  const [rows, setRows] = useState<ApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string | number | boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<ApiRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadRows = useCallback(async () => {
    if (!config.routeKey) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await request<unknown>(getRoute(config.routeKey), {
        params: routeParams,
        query: {
          page: 1,
          limit: 50,
          search,
          q: search,
          ...filters,
          ...forcedQuery,
        },
      });
      setRows(normalizeRows(payload));
    } catch (requestError) {
      setError(errorMessage(requestError, `Unable to load ${config.title}`));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [config.routeKey, config.title, filters, forcedQuery, routeParams, search]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const columns = useMemo<Array<DataTableColumn<ApiRecord>>>(() => {
    const mapped = config.columns.map<DataTableColumn<ApiRecord>>((column) => ({
      id: column.key,
      header: column.label,
      align: column.align,
      render: (row) => {
        const value = getValue(row, column.key);
        if (column.status) return <StatusBadge status={formatCell(value).toUpperCase()} />;
        return formatCell(value);
      },
    }));

    if (!config.detailPath && !config.deleteRouteKey) return mapped;

    return [
      ...mapped,
      {
        id: "actions",
        header: "",
        align: "right",
        render: (row) => {
          const id = getRecordId(row);
          return (
            <div className="flex justify-end gap-2">
              {config.detailPath && id ? (
                <Link
                  className="text-sm font-medium text-app-accent hover:text-app-accentHover"
                  to={config.detailPath.replace(":id", id)}
                >
                  Open
                </Link>
              ) : null}
              {config.deleteRouteKey && id ? (
                <button
                  className="text-app-error"
                  onClick={() => setDeleteTarget(row)}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          );
        },
      },
    ];
  }, [config.columns, config.deleteRouteKey, config.detailPath]);

  const deleteRecord = async () => {
    if (!deleteTarget || !config.deleteRouteKey) return;
    const id = getRecordId(deleteTarget);
    setDeleting(true);
    try {
      await request<unknown>(getRoute(config.deleteRouteKey), {
        params: { ...routeParams, id },
      });
      toast.success(`${config.title} record removed`);
      setDeleteTarget(null);
      await loadRows();
    } catch (requestError) {
      toast.error(errorMessage(requestError, "Delete failed"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title={config.title} subtitle={config.subtitle}>
        <SearchInput
          onChange={(event) => setSearch(event.target.value)}
          placeholder={config.searchPlaceholder ?? `Search ${config.title.toLowerCase()}`}
          value={search}
        />
        <SecondaryButton leftIcon={<RefreshCw className="h-4 w-4" />} onClick={loadRows}>
          Refresh
        </SecondaryButton>
        {config.newPath ? (
          <Link to={config.newPath}>
            <PrimaryButton leftIcon={<Plus className="h-4 w-4" />}>
              {config.newLabel ?? "New"}
            </PrimaryButton>
          </Link>
        ) : null}
      </PageHeader>

      {config.filters?.length ? (
        <div className="mb-4 grid gap-3 rounded-md border border-app-border bg-app-surface p-3 md:grid-cols-3">
          {config.filters.map((field) => (
            <FieldRenderer
              field={field}
              key={field.name}
              onChange={(name, value) =>
                setFilters((current) => ({
                  ...current,
                  [name]: typeof value === "boolean" ? value : String(value),
                }))
              }
              value={filters[field.name] ?? ""}
            />
          ))}
        </div>
      ) : null}

      {error ? (
        <EmptyState
          description={error}
          title={`Unable to load ${config.title.toLowerCase()}`}
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          emptyState={
            <EmptyState
              description={config.emptyDescription ?? "No records match the current filters."}
              title={config.emptyTitle ?? `No ${config.title.toLowerCase()} found`}
            />
          }
          getRowId={(row, index) => getRecordId(row) || `${config.title}-${index}`}
          loading={loading}
        />
      )}

      <ConfirmDialog
        description="This record will be removed from the active workspace."
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteRecord}
        open={Boolean(deleteTarget)}
        title="Delete record"
      />
    </div>
  );
};
