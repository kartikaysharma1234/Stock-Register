import { ArrowDownRight, ArrowUpRight, Package, ShieldAlert } from "lucide-react";
import { AreaChart } from "../../components/common/Charts";
import { ChartContainer } from "../../components/common/ChartContainer";
import { DataTable, type DataTableColumn } from "../../components/common/Table";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";

interface Kpi {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
}

interface RecentRequest {
  id: string;
  requestNo: string;
  department: string;
  items: number;
  status: string;
}

const kpis: Kpi[] = [
  { label: "Total Items", value: "1,248", change: "+8 this week", trend: "up" },
  { label: "Low Stock", value: "18", change: "-3 resolved", trend: "down" },
  { label: "Pending Requests", value: "7", change: "+2 today", trend: "up" },
  { label: "Asset Value", value: "Rs 42.8L", change: "+4.2%", trend: "up" },
];

const movementData = [
  { day: "01 Jun", movements: 22 },
  { day: "05 Jun", movements: 34 },
  { day: "10 Jun", movements: 28 },
  { day: "15 Jun", movements: 47 },
  { day: "20 Jun", movements: 39 },
  { day: "25 Jun", movements: 52 },
  { day: "30 Jun", movements: 44 },
];

const requests: RecentRequest[] = [
  { id: "1", requestNo: "REQ-2026-0142", department: "Maintenance", items: 4, status: "PENDING" },
  { id: "2", requestNo: "REQ-2026-0141", department: "Production", items: 2, status: "FULFILLED" },
  { id: "3", requestNo: "REQ-2026-0140", department: "Packaging", items: 6, status: "DEPT_APPROVED" },
];

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

export const DashboardPage = () => (
  <div>
    <PageHeader
      subtitle="A compact view of stock pressure, approvals, and operational movement."
      title="Dashboard"
    />

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <section
          className="rounded-md border border-app-border bg-app-surface p-4"
          key={kpi.label}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-app-muted">{kpi.label}</span>
            {kpi.label === "Low Stock" ? (
              <ShieldAlert className="h-4 w-4 text-app-warning" />
            ) : (
              <Package className="h-4 w-4 text-app-muted" />
            )}
          </div>
          <div className="mt-3 text-2xl font-semibold text-app-primary">
            {kpi.value}
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-app-muted">
            {kpi.trend === "up" ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-app-success" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5 text-app-success" />
            )}
            {kpi.change}
          </div>
        </section>
      ))}
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
      <ChartContainer
        subtitle="Last 30 days"
        title="Stock Movements"
      >
        <AreaChart data={movementData} xKey="day" yKey="movements" />
      </ChartContainer>
      <section className="rounded-md border border-app-border bg-app-surface p-4">
        <h2 className="text-sm font-semibold text-app-primary">Low Stock Alerts</h2>
        <div className="mt-4 space-y-3">
          {["Nitrile gloves", "Packing tape", "M8 bolts", "Thermal labels"].map(
            (item) => (
              <div
                className="flex items-center justify-between border-b border-app-border pb-3 last:border-b-0 last:pb-0"
                key={item}
              >
                <span className="text-sm text-app-primary">{item}</span>
                <span className="text-xs text-app-warning">Below threshold</span>
              </div>
            ),
          )}
        </div>
      </section>
    </div>

    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-app-primary">Recent Requests</h2>
        <span className="text-xs text-app-muted">Last 5 requests</span>
      </div>
      <DataTable
        columns={requestColumns}
        data={requests}
        getRowId={(row) => row.id}
      />
    </section>
  </div>
);
