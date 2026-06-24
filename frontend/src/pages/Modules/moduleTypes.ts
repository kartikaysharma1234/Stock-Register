import type { BackendRoute } from "../../service";
import type { QueryValue } from "../../service";

export type FieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "checkbox"
  | "json";

export interface FieldConfig {
  name: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  options?: Array<{ label: string; value: string }>;
  dynamicOptions?: {
    routeKey: string;
    labelKey?: string;
    valueKey?: string;
    query?: Record<string, QueryValue>;
  };
  helper?: string;
}

export interface ColumnConfig {
  key: string;
  label: string;
  status?: boolean;
  align?: "left" | "right" | "center";
}

export interface ActionConfig {
  label: string;
  routeKey?: string;
  path?: string;
  tone?: "primary" | "secondary" | "danger";
  confirm?: string;
  payload?: Record<string, QueryValue>;
  statuses?: string[];
}

export interface ModuleConfig {
  title: string;
  subtitle: string;
  routeKey?: string;
  createRouteKey?: string;
  detailRouteKey?: string;
  updateRouteKey?: string;
  deleteRouteKey?: string;
  columns: ColumnConfig[];
  fields?: FieldConfig[];
  searchPlaceholder?: string;
  newPath?: string;
  newLabel?: string;
  detailPath?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  filters?: FieldConfig[];
  actions?: ActionConfig[];
}

export interface RelationConfig extends ModuleConfig {
  routeParams: (params: Record<string, string | undefined>) => Record<string, string>;
}

export interface ReportConfig {
  title: string;
  subtitle: string;
  routeKey: string;
  method?: BackendRoute["method"];
  columns: ColumnConfig[];
  filters?: FieldConfig[];
  chart?: {
    xKey: string;
    yKey: string;
  };
}
