export type EntityId = string;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type Role =
  | "SUPER_ADMIN"
  | "ORG_ADMIN"
  | "ADMIN"
  | "SUB_ADMIN"
  | "DEPT_HEAD"
  | "STORE_MANAGER"
  | "REQUESTER"
  | "VIEWER";

export type Status =
  | "ACTIVE"
  | "INACTIVE"
  | "PENDING"
  | "REJECTED"
  | "DRAFT"
  | "FULFILLED"
  | "APPROVED"
  | "CANCELLED"
  | "PARTIALLY_FULFILLED";

export type RequestStatus =
  | "DRAFT"
  | "PENDING"
  | "DEPT_APPROVED"
  | "STORE_APPROVED"
  | "APPROVED"
  | "REJECTED"
  | "PARTIALLY_FULFILLED"
  | "FULFILLED"
  | "CANCELLED";

export type POStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "SENT"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED"
  | "REJECTED";

export type AssetStatus =
  | "AVAILABLE"
  | "ASSIGNED"
  | "MAINTENANCE"
  | "DISPOSED"
  | "LOST"
  | "DAMAGED";

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: IPaginationMeta;
}

export interface IApiError {
  success?: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface IOrganization {
  _id: EntityId;
  name: string;
  slug: string;
  code?: string;
  billingEmail?: string;
  subscriptionPlan?: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  subscriptionStatus?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IUser {
  _id: EntityId;
  organizationId?: EntityId;
  name: string;
  email: string;
  role: Role;
  customRoleId?: EntityId;
  permissions: string[];
  departmentId?: EntityId;
  warehouseId?: EntityId;
  departmentIds?: EntityId[];
  warehouseIds?: EntityId[];
  isActive: boolean;
  emailVerified?: boolean;
  lastLoginAt?: string;
}

export interface IWarehouse {
  _id: EntityId;
  organizationId: EntityId;
  name: string;
  code: string;
  type?: string;
  address?: string;
  managerId?: EntityId;
  isActive: boolean;
}

export interface IWarehouseZone {
  _id: EntityId;
  warehouseId: EntityId;
  name: string;
  code: string;
  isActive: boolean;
}

export interface ICategory {
  _id: EntityId;
  organizationId: EntityId;
  name: string;
  code?: string;
  parentId?: EntityId;
  isActive: boolean;
}

export interface IItem {
  _id: EntityId;
  organizationId: EntityId;
  name: string;
  sku: string;
  description?: string;
  categoryId?: EntityId;
  unit: string;
  barcode?: string;
  trackBatches?: boolean;
  trackExpiry?: boolean;
  isAsset?: boolean;
  reorderPoint?: number;
  reorderQuantity?: number;
  isActive: boolean;
}

export interface IStock {
  _id: EntityId;
  itemId: EntityId;
  warehouseId: EntityId;
  zoneId?: EntityId;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  averageCost?: number;
  totalValue?: number;
}

export interface IStockMovement {
  _id: EntityId;
  itemId: EntityId;
  warehouseId: EntityId;
  zoneId?: EntityId;
  departmentId?: EntityId;
  type: string;
  quantity: number;
  balanceAfter?: number;
  referenceType?: string;
  referenceId?: EntityId;
  performedBy?: EntityId;
  occurredAt: string;
}

export interface IDepartment {
  _id: EntityId;
  organizationId: EntityId;
  name: string;
  code: string;
  headId?: EntityId;
  budgetAllocated?: number;
  budgetCommitted?: number;
  budgetUsed?: number;
  isActive: boolean;
}

export interface IStockRequestLine {
  itemId: EntityId;
  requestedQuantity: number;
  approvedQuantity?: number;
  fulfilledQuantity?: number;
  unitCost?: number;
}

export interface IStockRequest {
  _id: EntityId;
  requestNumber: string;
  requestedBy: EntityId;
  departmentId: EntityId;
  warehouseId?: EntityId;
  status: RequestStatus;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  requiredBy?: string;
  items: IStockRequestLine[];
  createdAt?: string;
}

export interface IVendor {
  _id: EntityId;
  organizationId: EntityId;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  rating?: number;
  isActive: boolean;
}

export interface IPurchaseOrderLine {
  itemId: EntityId;
  quantity: number;
  unitCost: number;
  taxRate?: number;
  discount?: number;
}

export interface IPurchaseOrder {
  _id: EntityId;
  poNumber: string;
  vendorId: EntityId;
  warehouseId: EntityId;
  status: POStatus;
  items: IPurchaseOrderLine[];
  totalAmount: number;
  expectedDeliveryDate?: string;
  createdAt?: string;
}

export interface IGRN {
  _id: EntityId;
  grnNumber: string;
  purchaseOrderId: EntityId;
  vendorId: EntityId;
  warehouseId: EntityId;
  status?: string;
  receivedAt?: string;
}

export interface IPayment {
  _id: EntityId;
  vendorId: EntityId;
  purchaseOrderId?: EntityId;
  amount: number;
  mode: string;
  reference?: string;
  paidAt?: string;
}

export interface IAsset {
  _id: EntityId;
  assetTag: string;
  itemId: EntityId;
  warehouseId: EntityId;
  assignedTo?: EntityId;
  status: AssetStatus;
  purchaseValue?: number;
  currentValue?: number;
  nextMaintenanceDate?: string;
}

export interface IAuditLog {
  _id: EntityId;
  organizationId?: EntityId;
  actorId?: EntityId;
  action: string;
  module: string;
  entityType?: string;
  entityId?: EntityId;
  createdAt: string;
}

export interface INotification {
  _id: EntityId;
  userId: EntityId;
  title: string;
  message: string;
  type: string;
  readAt?: string;
  createdAt: string;
}

export interface IApiKey {
  _id: EntityId;
  name: string;
  prefix: string;
  scopes: string[];
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  expiresAt?: string;
  lastUsedAt?: string;
}

export interface IWebhook {
  _id: EntityId;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthPayload {
  user: IUser;
  organization?: IOrganization;
  tokens?: AuthTokens;
  accessToken?: string;
  refreshToken?: string;
}
