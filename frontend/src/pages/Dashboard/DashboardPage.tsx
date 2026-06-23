import { AlertCircle, ClipboardList, Package, ShieldAlert, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AreaChart, type ChartDatum } from "../../components/common/Charts";
import { ChartContainer } from "../../components/common/ChartContainer";
import { EmptyState } from "../../components/common/EmptyState";
import { DataTable, type DataTableColumn } from "../../components/common/Table";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { getRoute, request } from "../../service";

type ApiRecord = Record<string, unknown>;

interface DashboardSummary {
  stock?: {
    inStock?: number;
    lowStock?: number;
    outOfStock?: number;
    totalQuantity?: number;
    totalValue?: number;
  };
  requests?: {
    pending?: number;
    approved?: number;
    fulfilled?: number;
    rejected?: number;
  };
}

interface MovementReportRow extends ApiRecord {
  itemName?: string;
  sku?: string;
  type?: string;
  movements?: number;
  quantity?: number;
}

interface LowStockAlert {
  id: string;
  item: string;
  warehouse: string;
  available: number;
  threshold: number;
}

interface RecentRequest {
  id: string;
  requestNo: string;
  department: string;
  items: number;
  status: string;
}

interface Kpi {
  label: string;
  value: string;
  caption: string;
  icon: "stock" | "warning" | "requests" | "value";
}

const isRecord = (value: unknown): value is ApiRecord =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const normalizeRows = <TRow extends ApiRecord>(payload: unknown): TRow[] => {
  if (Array.isArray(payload)) return payload.filter(isRecord) as TRow[];
  if (!isRecord(payload)) return [];

  const rowKeys = [
    "rows",
    "data",
    "items",
    "records",
    "results",
    "requests",
    "movements",
    "balances",
  ];

  for (const key of rowKeys) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isRecord) as TRow[];
  }

  return [];
};

const numberValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const stringValue = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : "";

const referenceName = (value: unknown) => {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return "";

  return (
    stringValue(value.name) ||
    stringValue(value.title) ||
    stringValue(value.code) ||
    stringValue(value.email) ||
    stringValue(value.id) ||
    stringValue(value._id)
  );
};

const recordId = (row: ApiRecord, fallback: string) =>
  stringValue(row.id) || stringValue(row._id) || fallback;

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);

const formatMoney = (value: number) => `Rs ${formatNumber(Math.round(value))}`;

const errorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (isRecord(error) && typeof error.message === "string") return error.message;
  return fallback;
};

const reportRange = () => {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 30);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
};

const buildKpis = (summary?: DashboardSummary): Kpi[] => {
  const stock = summary?.stock ?? {};
  const requests = summary?.requests ?? {};
  const stockRecords =
    numberValue(stock.inStock) +
    numberValue(stock.lowStock) +
    numberValue(stock.outOfStock);

  return [
    {
      label: "Total Items",
      value: formatNumber(stockRecords),
      caption: `${formatNumber(numberValue(stock.totalQuantity))} units tracked`,
      icon: "stock",
    },
    {
      label: "Low Stock",
      value: formatNumber(numberValue(stock.lowStock)),
      caption: "Below configured threshold",
      icon: "warning",
    },
    {
      label: "Pending Requests",
      value: formatNumber(numberValue(requests.pending)),
      caption: "Awaiting approval action",
      icon: "requests",
    },
    {
      label: "Inventory Value",
      value: formatMoney(numberValue(stock.totalValue)),
      caption: "Current stock valuation",
      icon: "value",
    },
  ];
};

const buildMovementChart = (rows: MovementReportRow[]): ChartDatum[] => {
  const grouped = rows.reduce<Map<string, number>>((accumulator, row) => {
    const label = row.itemName || row.sku || row.type || "Movement";
    accumulator.set(
      label,
      (accumulator.get(label) ?? 0) + numberValue(row.movements ?? row.quantity),
    );
    return accumulator;
  }, new Map<string, number>());

  return [...grouped.entries()]
    .sort(([, first], [, second]) => second - first)
    .slice(0, 8)
    .map(([item, movements]) => ({ item, movements }));
};

const toLowStockAlerts = (rows: ApiRecord[]): LowStockAlert[] =>
  rows.slice(0, 5).map((row, index) => ({
    id: recordId(row, `low-stock-${index}`),
    item:
      stringValue(row.itemName) ||
      stringValue(row.name) ||
      referenceName(row.itemId) ||
      "Unnamed item",
    warehouse:
      stringValue(row.warehouseName) ||
      referenceName(row.warehouseId) ||
      "Warehouse not set",
    available: numberValue(row.availableQuantity ?? row.available ?? row.quantity),
    threshold: numberValue(
      row.threshold ?? row.reorderPoint ?? row.minStockThreshold,
    ),
  }));

const toRecentRequests = (rows: ApiRecord[]): RecentRequest[] =>
  rows.slice(0, 5).map((row, index) => ({
    id: recordId(row, `request-${index}`),
    requestNo:
      stringValue(row.requestNumber) ||
      stringValue(row.requestNo) ||
      `Request ${index + 1}`,
    department:
      referenceName(row.departmentId) ||
      stringValue(row.departmentName) ||
      "Department not set",
    items: Array.isArray(row.lines)
      ? row.lines.length
      : numberValue(row.items ?? row.itemCount),
    status: (stringValue(row.status) || "PENDING").toUpperCase(),
  }));

const requestColumns: Array<DataTableColumn<RecentRequest>> = [
  { id: "requestNo", header: "Request", accessor: "requestNo" },
  { id: "department", header: "Department", accessor: "department" },
  { id: "items", header: "Items", accessor: "items", align: "right" },
  {
    id: "status",
    header: "Status",
    render: (row) => <StatusBadge status={row.status} />,
  },
];

const iconByKpi = {
  stock: Package,
  warning: ShieldAlert,
  requests: ClipboardList,
  value: Wallet,
};

export const DashboardPage = () => {
  const range = useMemo(reportRange, []);
  const [summary, setSummary] = useState<DashboardSummary>();
  const [movementData, setMovementData] = useState<ChartDatum[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const [dashboard, movements, lowStock, pendingRequests] =
          await Promise.all([
            request<DashboardSummary>(getRoute("reports.dashboard"), {
              query: range,
            }),
            request<unknown>(getRoute("reports.stockMovements"), {
              query: range,
            }),
            request<unknown>(getRoute("reports.lowStock")),
            request<unknown>(getRoute("requests.pending"), {
              query: { page: 1, limit: 5, sortBy: "createdAt", sortOrder: "desc" },
            }),
          ]);

        if (!isCurrent) return;

        setSummary(dashboard);
        setMovementData(
          buildMovementChart(normalizeRows<MovementReportRow>(movements)),
        );
        setLowStockAlerts(toLowStockAlerts(normalizeRows(lowStock)));
        setRecentRequests(toRecentRequests(normalizeRows(pendingRequests)));
      } catch (requestError) {
        if (!isCurrent) return;
        setError(errorMessage(requestError, "Unable to load dashboard data"));
        setSummary(undefined);
        setMovementData([]);
        setLowStockAlerts([]);
        setRecentRequests([]);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadDashboard();

    return () => {
      isCurrent = false;
    };
  }, [range]);

  const kpis = useMemo(() => buildKpis(summary), [summary]);

  return (
    <div>
      <PageHeader
        subtitle="A compact live view of stock pressure, approvals, and operational movement."
        title="Dashboard"
      />

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-app-error/30 bg-red-50 px-4 py-3 text-sm text-app-error">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = iconByKpi[kpi.icon];
          const iconClass =
            kpi.icon === "warning" ? "text-app-warning" : "text-app-muted";

          return (
            <section
              className="rounded-md border border-app-border bg-app-surface p-4"
              key={kpi.label}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-app-muted">{kpi.label}</span>
                <Icon className={`h-4 w-4 ${iconClass}`} />
              </div>
              {loading ? (
                <div className="mt-3 h-8 w-24 animate-pulse rounded-md bg-gray-100" />
              ) : (
                <div className="mt-3 text-2xl font-semibold text-app-primary">
                  {kpi.value}
                </div>
              )}
              <div className="mt-2 text-xs text-app-muted">{kpi.caption}</div>
            </section>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <ChartContainer subtitle="Live report window: last 30 days" title="Stock Movements">
          {loading ? (
            <div className="h-72 animate-pulse rounded-md bg-gray-100" />
          ) : movementData.length > 0 ? (
            <AreaChart data={movementData} xKey="item" yKey="movements" />
          ) : (
            <EmptyState
              description="Create stock movements to see the live chart here."
              title="No stock movement data"
            />
          )}
        </ChartContainer>
        <section className="rounded-md border border-app-border bg-app-surface p-4">
          <h2 className="text-sm font-semibold text-app-primary">Low Stock Alerts</h2>
          {loading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  className="h-10 animate-pulse rounded-md bg-gray-100"
                  key={`low-stock-loading-${index}`}
                />
              ))}
            </div>
          ) : lowStockAlerts.length > 0 ? (
            <div className="mt-4 space-y-3">
              {lowStockAlerts.map((alert) => (
                <div
                  className="flex items-center justify-between gap-4 border-b border-app-border pb-3 last:border-b-0 last:pb-0"
                  key={alert.id}
                >
                  <div>
                    <p className="text-sm font-medium text-app-primary">
                      {alert.item}
                    </p>
                    <p className="mt-1 text-xs text-app-muted">
                      {alert.warehouse}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-app-warning">Below threshold</p>
                    <p className="mt-1 text-xs text-app-muted">
                      {formatNumber(alert.available)} / {formatNumber(alert.threshold)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              description="No balances below threshold were returned by the backend."
              title="No low stock alerts"
            />
          )}
        </section>
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-app-primary">Recent Requests</h2>
          <span className="text-xs text-app-muted">Latest pending approvals</span>
        </div>
        <DataTable
          columns={requestColumns}
          data={recentRequests}
          emptyState={
            <EmptyState
              description="The pending requests endpoint returned no approval items."
              title="No pending requests"
            />
          }
          getRowId={(row) => row.id}
          loading={loading}
        />
      </section>
    </div>
  );
};
