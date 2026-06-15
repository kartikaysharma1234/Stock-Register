export enum RequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  FULFILLED = "fulfilled",
  REJECTED = "rejected",
}

export enum PurchaseOrderStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  PARTIALLY_RECEIVED = "partially_received",
  RECEIVED = "received",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

export enum StockMovementType {
  INFLOW = "inflow",
  OUTFLOW = "outflow",
  ADJUSTMENT = "adjustment",
  TRANSFER_IN = "transfer_in",
  TRANSFER_OUT = "transfer_out",
}

export enum NotificationType {
  REQUEST_STATUS = "request_status",
  LOW_STOCK = "low_stock",
  PO_APPROVAL = "po_approval",
  INVITATION = "invitation",
  PASSWORD_RESET = "password_reset",
  REPORT_READY = "report_ready",
}
