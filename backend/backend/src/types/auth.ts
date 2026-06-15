import { Types } from "mongoose";
import { Permission, Role } from "../constants";

export interface AuthUser {
  id: string;
  organizationId?: string;
  role: Role;
  customRoleId?: string;
  permissions: Permission[];
  departmentId?: string;
  warehouseId?: string;
  departmentIds: string[];
  warehouseIds: string[];
}

export interface AuditContext {
  actorId?: Types.ObjectId | string;
  organizationId?: Types.ObjectId | string;
  ipAddress?: string;
  userAgent?: string;
}
