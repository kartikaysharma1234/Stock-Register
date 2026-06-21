import { createBrowserRouter, Navigate } from "react-router-dom";
import {
  AcceptInviteForm,
  ForgotPasswordForm,
  ResetPasswordForm,
  SignInForm,
  SignUpForm,
  VerifyEmail,
} from "../components/Auth";
import { MainWindow } from "../components/layouts/MainWindow";
import { AuthPage } from "../pages/Auth/AuthPage";
import { DashboardPage } from "../pages/Dashboard/DashboardPage";
import { PlaceholderPage } from "../pages/Placeholder/PlaceholderPage";
import { ProtectedRoute } from "./ProtectedRoute";

const placeholder = (title: string, moduleName?: string) => (
  <PlaceholderPage moduleName={moduleName} title={title} />
);

export const router = createBrowserRouter([
  { path: "/", element: <Navigate replace to="/dashboard" /> },
  {
    path: "/auth/login",
    element: (
      <AuthPage
        subtitle="Sign in to manage inventory, approvals, procurement, and assets."
        title="Sign in"
      >
        <SignInForm />
      </AuthPage>
    ),
  },
  {
    path: "/auth/register",
    element: (
      <AuthPage
        subtitle="Create your organization and first administrator account."
        title="Create organization"
      >
        <SignUpForm />
      </AuthPage>
    ),
  },
  {
    path: "/auth/forgot-password",
    element: (
      <AuthPage
        subtitle="Enter your account email and we will queue a reset link."
        title="Forgot password"
      >
        <ForgotPasswordForm />
      </AuthPage>
    ),
  },
  {
    path: "/auth/reset-password",
    element: (
      <AuthPage
        subtitle="Set a new password using the reset token from your email."
        title="Reset password"
      >
        <ResetPasswordForm />
      </AuthPage>
    ),
  },
  {
    path: "/auth/verify-email",
    element: (
      <AuthPage
        subtitle="Verify your email before signing in."
        title="Verify email"
      >
        <VerifyEmail />
      </AuthPage>
    ),
  },
  {
    path: "/auth/accept-invite",
    element: (
      <AuthPage
        subtitle="Accept the invitation and create your password."
        title="Accept invite"
      >
        <AcceptInviteForm />
      </AuthPage>
    ),
  },
  {
    element: (
      <ProtectedRoute>
        <MainWindow />
      </ProtectedRoute>
    ),
    children: [
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/inventory", element: placeholder("Inventory", "Inventory") },
      { path: "/inventory/items", element: placeholder("Items", "Inventory") },
      { path: "/inventory/items/new", element: placeholder("New Item", "Inventory") },
      { path: "/inventory/items/:id", element: placeholder("Item Detail", "Inventory") },
      { path: "/inventory/categories", element: placeholder("Categories", "Inventory") },
      { path: "/inventory/stock", element: placeholder("Stock Levels", "Inventory") },
      { path: "/inventory/movements", element: placeholder("Movements", "Inventory") },
      { path: "/inventory/low-stock", element: placeholder("Low Stock", "Inventory") },
      { path: "/inventory/expiring", element: placeholder("Expiring Stock", "Inventory") },
      { path: "/inventory/dead-stock", element: placeholder("Dead Stock", "Inventory") },
      { path: "/inventory/scan", element: placeholder("Barcode Scan", "Inventory") },
      { path: "/warehouses", element: placeholder("Warehouses", "Warehouses") },
      { path: "/warehouses/new", element: placeholder("New Warehouse", "Warehouses") },
      { path: "/warehouses/:id", element: placeholder("Warehouse Detail", "Warehouses") },
      { path: "/warehouses/:id/zones", element: placeholder("Warehouse Zones", "Warehouses") },
      { path: "/warehouses/:id/stock", element: placeholder("Warehouse Stock", "Warehouses") },
      { path: "/requests", element: placeholder("Requests", "Requests") },
      { path: "/requests/new", element: placeholder("New Request", "Requests") },
      { path: "/requests/:id", element: placeholder("Request Detail", "Requests") },
      { path: "/requests/pending", element: placeholder("Pending Approvals", "Requests") },
      { path: "/departments", element: placeholder("Departments", "Departments") },
      { path: "/departments/new", element: placeholder("New Department", "Departments") },
      { path: "/departments/:id", element: placeholder("Department Detail", "Departments") },
      { path: "/departments/:id/budget", element: placeholder("Department Budget", "Departments") },
      { path: "/vendors", element: placeholder("Vendors", "Vendors") },
      { path: "/vendors/new", element: placeholder("New Vendor", "Vendors") },
      { path: "/vendors/:id", element: placeholder("Vendor Detail", "Vendors") },
      { path: "/vendors/compare", element: placeholder("Vendor Compare", "Vendors") },
      { path: "/purchase-orders", element: placeholder("Purchase Orders", "Purchase Orders") },
      { path: "/purchase-orders/new", element: placeholder("New Purchase Order", "Purchase Orders") },
      { path: "/purchase-orders/:id", element: placeholder("Purchase Order Detail", "Purchase Orders") },
      { path: "/grn", element: placeholder("GRN", "GRN") },
      { path: "/grn/:id", element: placeholder("GRN Detail", "GRN") },
      { path: "/payments", element: placeholder("Payments", "Payments") },
      { path: "/assets", element: placeholder("Assets", "Assets") },
      { path: "/assets/new", element: placeholder("New Asset", "Assets") },
      { path: "/assets/:id", element: placeholder("Asset Detail", "Assets") },
      { path: "/assets/due-maintenance", element: placeholder("Due Maintenance", "Assets") },
      { path: "/reports", element: placeholder("Reports", "Reports") },
      { path: "/reports/stock-summary", element: placeholder("Stock Summary", "Reports") },
      { path: "/reports/stock-movements", element: placeholder("Stock Movements", "Reports") },
      { path: "/reports/department-consumption", element: placeholder("Department Consumption", "Reports") },
      { path: "/reports/low-stock", element: placeholder("Low Stock Report", "Reports") },
      { path: "/reports/dead-stock", element: placeholder("Dead Stock Report", "Reports") },
      { path: "/reports/expiry", element: placeholder("Expiry Report", "Reports") },
      { path: "/reports/valuation", element: placeholder("Inventory Valuation", "Reports") },
      { path: "/reports/purchase-orders", element: placeholder("Purchase Orders Report", "Reports") },
      { path: "/reports/vendor-performance", element: placeholder("Vendor Performance", "Reports") },
      { path: "/reports/request-fulfillment", element: placeholder("Request Fulfillment", "Reports") },
      { path: "/reports/asset-utilization", element: placeholder("Asset Utilization", "Reports") },
      { path: "/reports/budget-utilization", element: placeholder("Budget Utilization", "Reports") },
      { path: "/reports/audit-summary", element: placeholder("Audit Summary", "Reports") },
      { path: "/reports/custom", element: placeholder("Custom Report", "Reports") },
      { path: "/reports/saved", element: placeholder("Saved Reports", "Reports") },
      { path: "/audit-logs", element: placeholder("Audit Logs", "Audit") },
      { path: "/notifications", element: placeholder("Notifications", "Notifications") },
      { path: "/settings", element: placeholder("Settings", "Settings") },
      { path: "/settings/organization", element: placeholder("Organization Settings", "Settings") },
      { path: "/settings/users", element: placeholder("User Settings", "Settings") },
      { path: "/settings/roles", element: placeholder("Role Settings", "Settings") },
      { path: "/settings/billing", element: placeholder("Billing", "Settings") },
      { path: "/settings/api-keys", element: placeholder("API Keys", "Settings") },
      { path: "/settings/webhooks", element: placeholder("Webhooks", "Settings") },
      { path: "/settings/notifications", element: placeholder("Notification Settings", "Settings") },
    ],
  },
  { path: "*", element: <Navigate replace to="/dashboard" /> },
]);
