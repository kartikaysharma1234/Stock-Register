import { Types } from "mongoose";
import { Role } from "../constants/roles";

export interface AuthUser {
  id: string;
  organizationId?: string;
  role: Role;
  departmentIds: string[];
  warehouseIds: string[];
}

export interface AuditContext {
  actorId?: Types.ObjectId | string;
  organizationId?: Types.ObjectId | string;
  ipAddress?: string;
  userAgent?: string;
}
