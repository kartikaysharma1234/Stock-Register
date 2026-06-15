export enum Role {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  SUB_ADMIN = "sub_admin",
  STORE_MANAGER = "store_manager",
  DEPARTMENT_HEAD = "department_head",
  VIEWER = "viewer",
}

export const ASSIGNABLE_ROLES = Object.values(Role);
