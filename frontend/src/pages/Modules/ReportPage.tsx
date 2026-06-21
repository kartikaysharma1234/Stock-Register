import { Download, Play } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { BarChart } from "../../components/common/Charts";
import { ChartContainer } from "../../components/common/ChartContainer";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { DataTable, type DataTableColumn } from "../../components/common/Table";
import { PrimaryButton, SecondaryButton } from "../../components/common/Buttons";
import { getRoute, request } from "../../service";
import { errorMessage, formatCell, getRecordId, getValue, normalizeRows, type ApiRecord } from "./dataUtils";
import { FieldRenderer } from "./FieldRenderer";
import type { ReportConfig } from "./moduleTypes";

interface ReportPageProps {
  config: ReportConfig;
}

export const ReportPage = ({ config }: ReportPageProps) => {
  const [filters, setFilters] = useState<Record<string, string>>({
    startDate: "",
    endDate: "",
    warehouseId: "",
    departmentId: "",
  });
  const [rows, setRows] = useState<ApiRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await request<unknown>(getRoute(config.routeKey), {
        query: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          from: filters.startDate,
          to: filters.endDate,
          warehouseId: filters.warehouseId,
          departmentId: filters.departmentId,
        },
      });
      setRows(normalizeRows(payload));
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to load report"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const columns: Array<DataTableColumn<ApiRecord>> = config.columns.map((column) => ({
    id: column.key,
    header: column.label,
    align: column.align,
    render: (row) => formatCell(getValue(row, column.key)),
  }));

  const chartData = rows.map((row, index) => ({
    label: formatCell(getValue(row, config.chart?.xKey ?? "name")) || `Row ${index + 1}`,
    value: Number(getValue(row, config.chart?.yKey ?? "value") ?? 0),
  }));

  return (
    <div>
      <PageHeader title={config.title} subtitle={config.subtitle}>
        <SecondaryButton
          leftIcon={<Download className="h-4 w-4" />}
          onClick={() => toast("Export will use the backend report export endpoint.")}
        >
          Export
        </SecondaryButton>
        <PrimaryButton
          leftIcon={<Play className="h-4 w-4" />}
          loading={loading}
          onClick={loadReport}
        >
          Run report
        </PrimaryButton>
      </PageHeader>

      <section className="mb-5 grid gap-3 rounded-md border border-app-border bg-app-surface p-4 md:grid-cols-4">
        {[
          { name: "startDate", label: "Start date", type: "date" as const },
          { name: "endDate", label: "End date", type: "date" as const },
          { name: "warehouseId", label: "Warehouse ID" },
          { name: "departmentId", label: "Department ID" },
        ].map((field) => (
          <FieldRenderer
            field={field}
            key={field.name}
            onChange={(name, value) =>
              setFilters((current) => ({ ...current, [name]: String(value) }))
            }
            value={filters[field.name] ?? ""}
          />
        ))}
      </section>

      {config.chart ? (
        <div className="mb-5">
          <ChartContainer title={`${config.title} chart`}>
            {chartData.length ? (
              <BarChart data={chartData} xKey="label" yKey="value" />
            ) : (
              <EmptyState
                description="Run the report to populate the chart."
                title="No chart data yet"
              />
            )}
          </ChartContainer>
        </div>
      ) : null}

      {error ? (
        <EmptyState description={error} title="Report failed" />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          emptyState={
            <EmptyState
              description="Choose filters and run the report."
              title="No report data yet"
            />
          }
          getRowId={(row, index) => getRecordId(row) || `${config.title}-${index}`}
          loading={loading}
        />
      )}
    </div>
  );
};
