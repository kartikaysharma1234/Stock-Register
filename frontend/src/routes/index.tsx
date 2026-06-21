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
import { BillingSettingsPage } from "../pages/Modules/BillingSettingsPage";
import { CustomReportPage } from "../pages/Modules/CustomReportPage";
import { InventoryHubPage } from "../pages/Modules/InventoryHubPage";
import { ModuleDetailPage } from "../pages/Modules/ModuleDetailPage";
import { ModuleFormPage } from "../pages/Modules/ModuleFormPage";
import { ModuleListPage } from "../pages/Modules/ModuleListPage";
import { NotificationPreferencesPage } from "../pages/Modules/NotificationPreferencesPage";
import { OrganizationSettingsPage } from "../pages/Modules/OrganizationSettingsPage";
import { RelationPage } from "../pages/Modules/RelationPage";
import { ReportPage } from "../pages/Modules/ReportPage";
import { ReportsHubPage } from "../pages/Modules/ReportsHubPage";
import { ScanPage } from "../pages/Modules/ScanPage";
import { SettingsHomePage } from "../pages/Modules/SettingsHomePage";
import { StockActionsPage } from "../pages/Modules/StockActionsPage";
import { moduleConfigs, relationConfigs, reportConfigs } from "../pages/Modules/moduleConfigs";
import { ProtectedRoute } from "./ProtectedRoute";

const list = (key: keyof typeof moduleConfigs) => (
  <ModuleListPage config={moduleConfigs[key]} />
);

const detail = (key: keyof typeof moduleConfigs, backTo: string) => (
  <ModuleDetailPage backTo={backTo} config={moduleConfigs[key]} />
);

const form = (key: keyof typeof moduleConfigs, backTo: string) => (
  <ModuleFormPage backTo={backTo} config={moduleConfigs[key]} />
);

const relation = (key: keyof typeof relationConfigs) => (
  <RelationPage config={relationConfigs[key]} />
);

const report = (key: keyof typeof reportConfigs) => (
  <ReportPage config={reportConfigs[key]} />
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
      { path: "/inventory", element: <InventoryHubPage /> },
      { path: "/inventory/items", element: list("items") },
      { path: "/inventory/items/new", element: form("items", "/inventory/items") },
      { path: "/inventory/items/:id", element: detail("items", "/inventory/items") },
      { path: "/inventory/categories", element: list("categories") },
      { path: "/inventory/stock", element: list("stockLevels") },
      { path: "/inventory/movements", element: list("movements") },
      { path: "/inventory/low-stock", element: list("lowStock") },
      { path: "/inventory/expiring", element: list("expiring") },
      { path: "/inventory/dead-stock", element: list("deadStock") },
      { path: "/inventory/scan", element: <ScanPage /> },
      { path: "/inventory/transfer", element: <StockActionsPage kind="transfer" /> },
      { path: "/inventory/reconcile", element: <StockActionsPage kind="reconcile" /> },
      { path: "/warehouses", element: list("warehouses") },
      { path: "/warehouses/new", element: form("warehouses", "/warehouses") },
      { path: "/warehouses/:id", element: detail("warehouses", "/warehouses") },
      { path: "/warehouses/:id/zones", element: relation("warehouseZones") },
      { path: "/warehouses/:id/stock", element: relation("warehouseStock") },
      { path: "/requests", element: list("requests") },
      { path: "/requests/new", element: form("requests", "/requests") },
      { path: "/requests/pending", element: list("pendingRequests") },
      { path: "/requests/:id", element: detail("requests", "/requests") },
      { path: "/departments", element: list("departments") },
      { path: "/departments/new", element: form("departments", "/departments") },
      { path: "/departments/:id", element: detail("departments", "/departments") },
      { path: "/departments/:id/budget", element: relation("departmentBudget") },
      { path: "/vendors", element: list("vendors") },
      { path: "/vendors/new", element: form("vendors", "/vendors") },
      { path: "/vendors/compare", element: report("vendorPerformance") },
      { path: "/vendors/:id", element: detail("vendors", "/vendors") },
      { path: "/vendors/:id/orders", element: relation("vendorOrders") },
      { path: "/vendors/:id/payments", element: relation("vendorPayments") },
      { path: "/purchase-orders", element: list("purchaseOrders") },
      { path: "/purchase-orders/new", element: form("purchaseOrders", "/purchase-orders") },
      { path: "/purchase-orders/:id", element: detail("purchaseOrders", "/purchase-orders") },
      { path: "/grn", element: list("grn") },
      { path: "/grn/:id", element: detail("grn", "/grn") },
      { path: "/payments", element: list("payments") },
      { path: "/payments/new", element: form("payments", "/payments") },
      { path: "/assets", element: list("assets") },
      { path: "/assets/new", element: form("assets", "/assets") },
      { path: "/assets/due-maintenance", element: list("dueMaintenance") },
      { path: "/assets/:id", element: detail("assets", "/assets") },
      { path: "/assets/:id/history", element: relation("assetHistory") },
      { path: "/reports", element: <ReportsHubPage /> },
      { path: "/reports/stock-summary", element: report("stockSummary") },
      { path: "/reports/stock-movements", element: report("stockMovements") },
      { path: "/reports/department-consumption", element: report("departmentConsumption") },
      { path: "/reports/low-stock", element: report("lowStock") },
      { path: "/reports/dead-stock", element: report("deadStock") },
      { path: "/reports/expiry", element: report("expiry") },
      { path: "/reports/valuation", element: report("valuation") },
      { path: "/reports/purchase-orders", element: report("purchaseOrders") },
      { path: "/reports/vendor-performance", element: report("vendorPerformance") },
      { path: "/reports/request-fulfillment", element: report("requestFulfillment") },
      { path: "/reports/asset-utilization", element: report("assetUtilization") },
      { path: "/reports/budget-utilization", element: report("budgetUtilization") },
      { path: "/reports/audit-summary", element: report("auditSummary") },
      { path: "/reports/custom", element: <CustomReportPage /> },
      { path: "/reports/saved", element: report("saved") },
      { path: "/audit-logs", element: list("auditLogs") },
      { path: "/notifications", element: list("notifications") },
      { path: "/settings", element: <SettingsHomePage /> },
      { path: "/settings/organization", element: <OrganizationSettingsPage /> },
      { path: "/settings/users", element: list("users") },
      { path: "/settings/users/new", element: form("users", "/settings/users") },
      { path: "/settings/roles", element: list("roles") },
      { path: "/settings/roles/new", element: form("roles", "/settings/roles") },
      { path: "/settings/billing", element: <BillingSettingsPage /> },
      { path: "/settings/api-keys", element: list("apiKeys") },
      { path: "/settings/api-keys/new", element: form("apiKeys", "/settings/api-keys") },
      { path: "/settings/webhooks", element: list("webhooks") },
      { path: "/settings/webhooks/new", element: form("webhooks", "/settings/webhooks") },
      { path: "/settings/webhooks/:id", element: detail("webhooks", "/settings/webhooks") },
      { path: "/settings/webhooks/:id/deliveries", element: relation("webhookDeliveries") },
      { path: "/settings/notifications", element: <NotificationPreferencesPage /> },
    ],
  },
  { path: "*", element: <Navigate replace to="/dashboard" /> },
]);
