import {
  Archive,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  FileClock,
  Home,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users,
  Warehouse,
  X,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAppContext } from "../../../AppProvider/AppContext";
import { cn } from "../../../utils/cn";
import { IconButton } from "../../common/Buttons";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permission?: string;
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", to: "/dashboard", icon: Home }],
  },
  {
    label: "Inventory",
    items: [
      { label: "Items", to: "/inventory/items", icon: Package, permission: "inventory:read" },
      { label: "Categories", to: "/inventory/categories", icon: Archive, permission: "category:read" },
      { label: "Stock Levels", to: "/inventory/stock", icon: BarChart3, permission: "inventory:read" },
      { label: "Movements", to: "/inventory/movements", icon: FileClock, permission: "inventory:read" },
      { label: "Warehouses", to: "/warehouses", icon: Warehouse, permission: "warehouse:read" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Requests", to: "/requests", icon: ClipboardList, permission: "request:read", badge: "0" },
      { label: "Departments", to: "/departments", icon: Building2, permission: "department:read" },
      { label: "Purchase Orders", to: "/purchase-orders", icon: ShoppingCart, permission: "purchase:read" },
      { label: "GRN", to: "/grn", icon: ReceiptText, permission: "grn:read" },
      { label: "Payments", to: "/payments", icon: ReceiptText, permission: "payment:read" },
    ],
  },
  {
    label: "Vendors",
    items: [{ label: "Vendors", to: "/vendors", icon: Users, permission: "vendor:read" }],
  },
  {
    label: "Assets",
    items: [{ label: "Assets", to: "/assets", icon: Archive, permission: "asset:read", badge: "0" }],
  },
  {
    label: "Analytics",
    items: [{ label: "Reports", to: "/reports", icon: BarChart3, permission: "report:read" }],
  },
  {
    label: "Compliance",
    items: [
      { label: "Audit Logs", to: "/audit-logs", icon: ShieldCheck, permission: "audit:read" },
      { label: "Notifications", to: "/notifications", icon: Bell, permission: "notification:read" },
    ],
  },
];

const bottomItems: NavItem[] = [
  { label: "Settings", to: "/settings", icon: Settings },
];

export const Sidebar = ({ open, onClose }: SidebarProps) => {
  const { hasPermission } = useAppContext();

  const renderItem = (item: NavItem) => (
    <NavLink
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-app-sidebarText transition hover:bg-white/10 hover:text-white",
          isActive && "bg-white/10 text-app-sidebarActive",
        )
      }
      key={item.to}
      onClick={onClose}
      to={item.to}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] text-white">
          {item.badge}
        </span>
      ) : null}
    </NavLink>
  );

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-gray-950/40 transition md:hidden",
          open ? "block" : "hidden",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-app-sidebar px-3 py-4 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-5 flex items-center justify-between px-2">
          <div>
            <div className="text-base font-semibold text-white">StockManager</div>
            <div className="text-xs text-app-sidebarText">Inventory control</div>
          </div>
          <IconButton
            ariaLabel="Close navigation"
            className="border-white/10 bg-white/5 text-white md:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto">
          {navGroups.map((group) => {
            const items = group.items.filter((item) => hasPermission(item.permission));
            if (items.length === 0) return null;

            return (
              <div key={group.label}>
                <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {group.label}
                </div>
                <div className="space-y-1">{items.map(renderItem)}</div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 pt-3">
          {bottomItems.filter((item) => hasPermission(item.permission)).map(renderItem)}
        </div>
      </aside>
    </>
  );
};
