export enum Role {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  SUB_ADMIN = "sub_admin",
  STORE_MANAGER = "store_manager",
  DEPARTMENT_HEAD = "department_head",
  DEPT_HEAD = "department_head",
  VIEWER = "viewer",
}

export const ROLE_HIERARCHY: Readonly<Record<Role, number>> = Object.freeze({
  [Role.SUPER_ADMIN]: 60,
  [Role.ADMIN]: 50,
  [Role.SUB_ADMIN]: 40,
  [Role.STORE_MANAGER]: 30,
  [Role.DEPARTMENT_HEAD]: 20,
  [Role.VIEWER]: 10,
});

export const ASSIGNABLE_ROLES = Object.freeze(
  [...new Set(Object.values(Role))] as Role[],
);

export enum Permission {
  INVENTORY_CREATE = "inventory:create",
  INVENTORY_READ = "inventory:read",
  INVENTORY_UPDATE = "inventory:update",
  INVENTORY_DELETE = "inventory:delete",

  STOCK_ADJUST = "stock:adjust",
  STOCK_TRANSFER = "stock:transfer",
  STOCK_RECONCILE = "stock:reconcile",

  CATEGORY_CREATE = "category:create",
  CATEGORY_READ = "category:read",
  CATEGORY_UPDATE = "category:update",
  CATEGORY_DELETE = "category:delete",

  REQUEST_CREATE = "request:create",
  REQUEST_READ = "request:read",
  REQUEST_UPDATE = "request:update",
  REQUEST_APPROVE = "request:approve",
  REQUEST_REJECT = "request:reject",
  REQUEST_FULFILL = "request:fulfill",
  REQUEST_CANCEL = "request:cancel",
  REQUEST_OVERRIDE = "request:override",

  PURCHASE_CREATE = "purchase:create",
  PURCHASE_READ = "purchase:read",
  PURCHASE_UPDATE = "purchase:update",
  PURCHASE_APPROVE = "purchase:approve",
  PURCHASE_RECEIVE = "purchase:receive",
  PURCHASE_SEND = "purchase:send",
  PURCHASE_CANCEL = "purchase:cancel",

  GRN_CREATE = "grn:create",
  GRN_READ = "grn:read",

  VENDOR_CREATE = "vendor:create",
  VENDOR_READ = "vendor:read",
  VENDOR_UPDATE = "vendor:update",
  VENDOR_DELETE = "vendor:delete",

  PAYMENT_CREATE = "payment:create",
  PAYMENT_READ = "payment:read",

  WAREHOUSE_CREATE = "warehouse:create",
  WAREHOUSE_READ = "warehouse:read",
  WAREHOUSE_UPDATE = "warehouse:update",
  WAREHOUSE_DELETE = "warehouse:delete",

  DEPARTMENT_CREATE = "department:create",
  DEPARTMENT_READ = "department:read",
  DEPARTMENT_UPDATE = "department:update",
  DEPARTMENT_DELETE = "department:delete",

  USER_CREATE = "user:create",
  USER_READ = "user:read",
  USER_UPDATE = "user:update",
  USER_DELETE = "user:delete",
  USER_INVITE = "user:invite",

  ROLE_CREATE = "role:create",
  ROLE_READ = "role:read",
  ROLE_UPDATE = "role:update",
  ROLE_DELETE = "role:delete",

  REPORT_READ = "report:read",
  REPORT_EXPORT = "report:export",
  REPORT_SAVE = "report:save",
  REPORT_SCHEDULE = "report:schedule",

  AUDIT_READ = "audit:read",
  AUDIT_EXPORT = "audit:export",

  ASSET_CREATE = "asset:create",
  ASSET_READ = "asset:read",
  ASSET_UPDATE = "asset:update",
  ASSET_ASSIGN = "asset:assign",
  ASSET_RETURN = "asset:return",
  ASSET_MAINTAIN = "asset:maintain",
  ASSET_DISPOSE = "asset:dispose",

  NOTIFICATION_READ = "notification:read",
  NOTIFICATION_UPDATE = "notification:update",
  NOTIFICATION_PREFERENCES = "notification:preferences",

  BILLING_READ = "billing:read",
  BILLING_MANAGE = "billing:manage",

  APIKEY_CREATE = "apikey:create",
  APIKEY_READ = "apikey:read",
  APIKEY_DELETE = "apikey:delete",
  APIKEY_ROTATE = "apikey:rotate",

  WEBHOOK_CREATE = "webhook:create",
  WEBHOOK_READ = "webhook:read",
  WEBHOOK_UPDATE = "webhook:update",
  WEBHOOK_DELETE = "webhook:delete",
  WEBHOOK_TEST = "webhook:test",

  ORGANIZATION_READ = "organization:read",
  ORGANIZATION_UPDATE = "organization:update",

  // Compatibility permissions used by the current MVP routes.
  ORGANISATION_READ = "organisation:read",
  ORGANISATION_MANAGE = "organisation:manage",
  USER_MANAGE = "user:manage",
  MASTER_DATA_READ = "master_data:read",
  MASTER_DATA_MANAGE = "master_data:manage",
  INVENTORY_MANAGE = "inventory:manage",
  STOCK_MOVE = "stock:move",
  PROCUREMENT_READ = "procurement:read",
  PROCUREMENT_MANAGE = "procurement:manage",
  PO_APPROVE = "purchase_order:approve",
}

const uniquePermissions = (
  ...groups: ReadonlyArray<readonly Permission[]>
): readonly Permission[] =>
  Object.freeze([...new Set(groups.flat())] as Permission[]);

const inventoryReadPermissions = [
  Permission.INVENTORY_READ,
  Permission.CATEGORY_READ,
  Permission.WAREHOUSE_READ,
  Permission.MASTER_DATA_READ,
] as const;

const inventoryManagePermissions = [
  Permission.INVENTORY_CREATE,
  Permission.INVENTORY_UPDATE,
  Permission.INVENTORY_DELETE,
  Permission.INVENTORY_MANAGE,
  Permission.STOCK_ADJUST,
  Permission.STOCK_TRANSFER,
  Permission.STOCK_RECONCILE,
  Permission.STOCK_MOVE,
  Permission.CATEGORY_CREATE,
  Permission.CATEGORY_UPDATE,
  Permission.CATEGORY_DELETE,
] as const;

const requestReadPermissions = [Permission.REQUEST_READ] as const;
const requestManagePermissions = [
  Permission.REQUEST_CREATE,
  Permission.REQUEST_UPDATE,
  Permission.REQUEST_APPROVE,
  Permission.REQUEST_REJECT,
  Permission.REQUEST_FULFILL,
  Permission.REQUEST_CANCEL,
  Permission.REQUEST_OVERRIDE,
] as const;

const procurementReadPermissions = [
  Permission.PURCHASE_READ,
  Permission.GRN_READ,
  Permission.VENDOR_READ,
  Permission.PAYMENT_READ,
  Permission.PROCUREMENT_READ,
] as const;

const procurementManagePermissions = [
  Permission.PURCHASE_CREATE,
  Permission.PURCHASE_UPDATE,
  Permission.PURCHASE_APPROVE,
  Permission.PURCHASE_RECEIVE,
  Permission.PURCHASE_SEND,
  Permission.PURCHASE_CANCEL,
  Permission.GRN_CREATE,
  Permission.VENDOR_CREATE,
  Permission.VENDOR_UPDATE,
  Permission.VENDOR_DELETE,
  Permission.PAYMENT_CREATE,
  Permission.PROCUREMENT_MANAGE,
  Permission.PO_APPROVE,
] as const;

const organizationReadPermissions = [
  Permission.ORGANIZATION_READ,
  Permission.ORGANISATION_READ,
  Permission.DEPARTMENT_READ,
  Permission.WAREHOUSE_READ,
  Permission.USER_READ,
  Permission.ROLE_READ,
] as const;

const organizationReferencePermissions = [
  Permission.ORGANIZATION_READ,
  Permission.ORGANISATION_READ,
  Permission.DEPARTMENT_READ,
  Permission.WAREHOUSE_READ,
] as const;

const organizationManagePermissions = [
  Permission.ORGANIZATION_UPDATE,
  Permission.ORGANISATION_MANAGE,
  Permission.DEPARTMENT_CREATE,
  Permission.DEPARTMENT_UPDATE,
  Permission.DEPARTMENT_DELETE,
  Permission.WAREHOUSE_CREATE,
  Permission.WAREHOUSE_UPDATE,
  Permission.WAREHOUSE_DELETE,
  Permission.USER_CREATE,
  Permission.USER_UPDATE,
  Permission.USER_DELETE,
  Permission.USER_INVITE,
  Permission.USER_MANAGE,
  Permission.ROLE_CREATE,
  Permission.ROLE_UPDATE,
  Permission.ROLE_DELETE,
  Permission.MASTER_DATA_MANAGE,
] as const;

const reportingPermissions = [
  Permission.REPORT_READ,
  Permission.REPORT_EXPORT,
  Permission.REPORT_SAVE,
  Permission.REPORT_SCHEDULE,
] as const;

const notificationPermissions = [
  Permission.NOTIFICATION_READ,
  Permission.NOTIFICATION_UPDATE,
  Permission.NOTIFICATION_PREFERENCES,
] as const;

const assetReadPermissions = [Permission.ASSET_READ] as const;
const assetManagePermissions = [
  Permission.ASSET_CREATE,
  Permission.ASSET_UPDATE,
  Permission.ASSET_ASSIGN,
  Permission.ASSET_RETURN,
  Permission.ASSET_MAINTAIN,
  Permission.ASSET_DISPOSE,
] as const;

export const ALL_PERMISSIONS = uniquePermissions(
  Object.values(Permission),
);

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> =
  Object.freeze({
    [Role.SUPER_ADMIN]: ALL_PERMISSIONS,
    [Role.ADMIN]: ALL_PERMISSIONS,
    [Role.SUB_ADMIN]: uniquePermissions(
      organizationReadPermissions,
      inventoryReadPermissions,
      inventoryManagePermissions,
      requestReadPermissions,
      requestManagePermissions,
      procurementReadPermissions,
      procurementManagePermissions,
      reportingPermissions,
      notificationPermissions,
      assetReadPermissions,
      assetManagePermissions,
      [Permission.AUDIT_READ, Permission.AUDIT_EXPORT],
    ),
    [Role.STORE_MANAGER]: uniquePermissions(
      inventoryReadPermissions,
      [
        Permission.INVENTORY_UPDATE,
        Permission.INVENTORY_MANAGE,
        Permission.STOCK_ADJUST,
        Permission.STOCK_TRANSFER,
        Permission.STOCK_RECONCILE,
        Permission.STOCK_MOVE,
      ],
      requestReadPermissions,
      [
        Permission.REQUEST_APPROVE,
        Permission.REQUEST_REJECT,
        Permission.REQUEST_FULFILL,
      ],
      procurementReadPermissions,
      [Permission.PURCHASE_RECEIVE, Permission.GRN_CREATE],
      [Permission.REPORT_READ, Permission.REPORT_EXPORT],
      notificationPermissions,
      assetReadPermissions,
      [
        Permission.ASSET_ASSIGN,
        Permission.ASSET_RETURN,
        Permission.ASSET_MAINTAIN,
      ],
    ),
    [Role.DEPARTMENT_HEAD]: uniquePermissions(
      [
        Permission.ORGANIZATION_READ,
        Permission.ORGANISATION_READ,
        Permission.DEPARTMENT_READ,
      ],
      inventoryReadPermissions,
      requestReadPermissions,
      [
        Permission.REQUEST_CREATE,
        Permission.REQUEST_UPDATE,
        Permission.REQUEST_APPROVE,
        Permission.REQUEST_REJECT,
        Permission.REQUEST_CANCEL,
      ],
      [Permission.REPORT_READ, Permission.REPORT_EXPORT],
      notificationPermissions,
      assetReadPermissions,
    ),
    [Role.VIEWER]: uniquePermissions(
      organizationReferencePermissions,
      inventoryReadPermissions,
      requestReadPermissions,
      procurementReadPermissions,
      [Permission.REPORT_READ, Permission.AUDIT_READ],
      [Permission.NOTIFICATION_READ],
      assetReadPermissions,
    ),
  });

export enum SubscriptionPlan {
  FREE = "free",
  PRO = "pro",
  ENTERPRISE = "enterprise",
}

export enum SubscriptionStatus {
  PENDING = "pending",
  ACTIVE = "active",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

export enum PlanFeature {
  USERS = "users",
  WAREHOUSES = "warehouses",
  ITEMS = "items",
  API_ACCESS = "api_access",
  WHITELABEL = "whitelabel",
}

export interface PlanLimits {
  maxUsers: number | null;
  maxWarehouses: number | null;
  maxItems: number | null;
  apiAccess: boolean;
  whitelabel: boolean;
  requestsPerMinute: number | null;
}

export const PLAN_LIMITS: Readonly<Record<SubscriptionPlan, PlanLimits>> =
  Object.freeze({
    [SubscriptionPlan.FREE]: Object.freeze({
      maxUsers: 5,
      maxWarehouses: 1,
      maxItems: 100,
      apiAccess: false,
      whitelabel: false,
      requestsPerMinute: 100,
    }),
    [SubscriptionPlan.PRO]: Object.freeze({
      maxUsers: 50,
      maxWarehouses: 10,
      maxItems: 10_000,
      apiAccess: true,
      whitelabel: false,
      requestsPerMinute: 500,
    }),
    [SubscriptionPlan.ENTERPRISE]: Object.freeze({
      maxUsers: null,
      maxWarehouses: null,
      maxItems: null,
      apiAccess: true,
      whitelabel: true,
      requestsPerMinute: null,
    }),
  });

export enum WarehouseType {
  MAIN = "main",
  SECONDARY = "secondary",
  TRANSIT = "transit",
}

export enum ItemUnit {
  PCS = "pcs",
  KG = "kg",
  LTR = "ltr",
  MTR = "mtr",
  BOX = "box",
  DOZEN = "dozen",
  SET = "set",
}

export enum ValuationMethod {
  FIFO = "fifo",
  LIFO = "lifo",
  FEFO = "fefo",
  WEIGHTED_AVERAGE = "weighted_average",
}

export enum StockMovementType {
  INFLOW = "inflow",
  OUTFLOW = "outflow",
  TRANSFER = "transfer",
  ADJUSTMENT = "adjustment",
  RETURN = "return",
  DAMAGE = "damage",
  TRANSFER_IN = "transfer_in",
  TRANSFER_OUT = "transfer_out",
}

export enum StockReferenceType {
  PURCHASE_ORDER = "purchase_order",
  STOCK_REQUEST = "stock_request",
  TRANSFER = "transfer",
  MANUAL = "manual",
  GRN = "grn",
}

export enum RequestStatus {
  DRAFT = "draft",
  PENDING = "pending",
  DEPT_APPROVED = "dept_approved",
  STORE_APPROVED = "store_approved",
  APPROVED = "approved",
  FULFILLED = "fulfilled",
  PARTIALLY_FULFILLED = "partially_fulfilled",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

export enum RequestPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export enum RequestAction {
  CREATED = "created",
  UPDATED = "updated",
  SUBMITTED = "submitted",
  DEPARTMENT_APPROVED = "department_approved",
  STORE_APPROVED = "store_approved",
  REJECTED = "rejected",
  PARTIALLY_FULFILLED = "partially_fulfilled",
  FULFILLED = "fulfilled",
  CANCELLED = "cancelled",
  OVERRIDDEN = "overridden",
}

export enum BudgetPeriod {
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
}

export enum PurchaseOrderStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  SENT_TO_VENDOR = "sent_to_vendor",
  PARTIALLY_RECEIVED = "partially_received",
  RECEIVED = "received",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

export enum PaymentTerm {
  IMMEDIATE = "immediate",
  NET15 = "net15",
  NET30 = "net30",
  NET45 = "net45",
  NET60 = "net60",
}

export enum PaymentMode {
  CASH = "cash",
  BANK_TRANSFER = "bank_transfer",
  CHEQUE = "cheque",
  UPI = "upi",
}

export enum GrnItemCondition {
  GOOD = "good",
  DAMAGED = "damaged",
  PARTIAL = "partial",
}

export enum AssetStatus {
  AVAILABLE = "available",
  ASSIGNED = "assigned",
  UNDER_MAINTENANCE = "under_maintenance",
  DAMAGED = "damaged",
  DISPOSED = "disposed",
}

export enum DepreciationMethod {
  STRAIGHT_LINE = "straight_line",
  DECLINING_BALANCE = "declining_balance",
}

export enum AssetAction {
  ASSIGNED = "assigned",
  RETURNED = "returned",
  MAINTENANCE_STARTED = "maintenance_started",
  MAINTENANCE_DONE = "maintenance_done",
  DAMAGED = "damaged",
  DISPOSED = "disposed",
}

export enum AuditModule {
  INVENTORY = "inventory",
  REQUEST = "request",
  PURCHASE = "purchase",
  ASSET = "asset",
  AUDIT = "audit",
  USER = "user",
  BILLING = "billing",
  AUTH = "auth",
  ORGANIZATION = "organization",
  WEBHOOK = "webhook",
  API_KEY = "api_key",
}

export enum NotificationType {
  LOW_STOCK = "low_stock",
  EXPIRY_ALERT = "expiry_alert",
  REQUEST_UPDATE = "request_update",
  REQUEST_STATUS = "request_status",
  PO_UPDATE = "po_update",
  PO_APPROVAL = "po_approval",
  ASSET_DUE = "asset_due",
  BUDGET_ALERT = "budget_alert",
  SYSTEM = "system",
  INVITATION = "invitation",
  PASSWORD_RESET = "password_reset",
  REPORT_READY = "report_ready",
}

export enum NotificationChannel {
  EMAIL = "email",
  IN_APP = "in_app",
  WHATSAPP = "whatsapp",
  SMS = "sms",
  SLACK = "slack",
}

export enum ReportFrequency {
  NONE = "none",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

export enum WebhookEvent {
  STOCK_LOW = "stock.low",
  STOCK_UPDATED = "stock.updated",
  REQUEST_CREATED = "request.created",
  REQUEST_APPROVED = "request.approved",
  REQUEST_FULFILLED = "request.fulfilled",
  PO_CREATED = "po.created",
  PO_APPROVED = "po.approved",
  GRN_RECEIVED = "grn.received",
  ASSET_ASSIGNED = "asset.assigned",
  ASSET_RETURNED = "asset.returned",
  USER_INVITED = "user.invited",
  PAYMENT_RECORDED = "payment.recorded",
}

export enum WebhookDeliveryStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
  EXHAUSTED = "exhausted",
}

export enum CounterType {
  PURCHASE_ORDER = "purchase_order",
  GRN = "grn",
  STOCK_REQUEST = "stock_request",
  ASSET = "asset",
}

export enum SortOrder {
  ASC = "asc",
  DESC = "desc",
}
