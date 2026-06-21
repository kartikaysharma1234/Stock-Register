import { BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";

const reports = [
  ["Stock Summary", "/reports/stock-summary"],
  ["Stock Movements", "/reports/stock-movements"],
  ["Department Consumption", "/reports/department-consumption"],
  ["Low Stock", "/reports/low-stock"],
  ["Dead Stock", "/reports/dead-stock"],
  ["Expiry", "/reports/expiry"],
  ["Valuation", "/reports/valuation"],
  ["Purchase Orders", "/reports/purchase-orders"],
  ["Vendor Performance", "/reports/vendor-performance"],
  ["Request Fulfillment", "/reports/request-fulfillment"],
  ["Asset Utilization", "/reports/asset-utilization"],
  ["Budget Utilization", "/reports/budget-utilization"],
  ["Audit Summary", "/reports/audit-summary"],
  ["Saved Reports", "/reports/saved"],
];

export const ReportsHubPage = () => (
  <div>
    <PageHeader
      subtitle="Run operational, inventory, procurement, asset, and compliance reports."
      title="Reports"
    />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {reports.map(([label, to]) => (
        <Link
          className="rounded-md border border-app-border bg-app-surface p-4 transition hover:border-app-accent"
          key={to}
          to={to}
        >
          <BarChart3 className="h-5 w-5 text-app-accent" />
          <div className="mt-4 text-sm font-semibold text-app-primary">{label}</div>
          <div className="mt-1 text-sm text-app-muted">Filters, table, chart, and export workflow.</div>
        </Link>
      ))}
    </div>
  </div>
);
