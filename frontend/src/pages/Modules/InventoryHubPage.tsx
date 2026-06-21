import { Link } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";

const sections = [
  ["Items", "/inventory/items", "SKU master, thresholds, tracking rules"],
  ["Categories", "/inventory/categories", "Nested item organization"],
  ["Stock Levels", "/inventory/stock", "Balances across warehouses"],
  ["Movements", "/inventory/movements", "Movement audit trail"],
  ["Low Stock", "/inventory/low-stock", "Below threshold balances"],
  ["Expiring", "/inventory/expiring", "Expiry-controlled batches"],
  ["Dead Stock", "/inventory/dead-stock", "No recent movement"],
  ["Scan", "/inventory/scan", "Barcode or QR lookup"],
];

export const InventoryHubPage = () => (
  <div>
    <PageHeader
      subtitle="Inventory workspaces for master data, balances, movement, and scanning."
      title="Inventory"
    />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {sections.map(([title, to, description]) => (
        <Link
          className="rounded-md border border-app-border bg-app-surface p-4 transition hover:border-app-accent"
          key={to}
          to={to}
        >
          <div className="text-sm font-semibold text-app-primary">{title}</div>
          <div className="mt-2 text-sm text-app-muted">{description}</div>
        </Link>
      ))}
    </div>
  </div>
);
