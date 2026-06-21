import type { ReactNode } from "react";
import { cn } from "../../../utils/cn";
import { EmptyState } from "../EmptyState";

export interface DataTableColumn<T extends object> {
  id: string;
  header: string;
  accessor?: keyof T | ((row: T) => ReactNode);
  render?: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}

interface DataTableProps<T extends object> {
  columns: Array<DataTableColumn<T>>;
  data: T[];
  loading?: boolean;
  emptyState?: ReactNode;
  getRowId?: (row: T, index: number) => string;
}

const renderValue = (value: unknown): ReactNode => {
  if (value === null || value === undefined || value === "") return "-";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return JSON.stringify(value);
};

export const DataTable = <T extends object>({
  columns,
  data,
  loading = false,
  emptyState,
  getRowId,
}: DataTableProps<T>) => {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-md border border-app-border bg-app-surface">
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              className="h-9 animate-pulse rounded-md bg-gray-100"
              key={`loading-row-${index}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <>
        {emptyState ?? (
          <EmptyState
            description="Create a record or adjust your filters to see results here."
            title="No records found"
          />
        )}
      </>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-app-border bg-app-surface">
      <table className="min-w-full divide-y divide-app-border text-left text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                className={cn(
                  "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-app-muted",
                  column.align === "right" && "text-right",
                  column.align === "center" && "text-center",
                  column.className,
                )}
                key={column.id}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-app-border">
          {data.map((row, rowIndex) => (
            <tr
              className="transition hover:bg-gray-50"
              key={getRowId?.(row, rowIndex) ?? `row-${rowIndex}`}
            >
              {columns.map((column) => {
                const value =
                  column.render?.(row) ??
                  (typeof column.accessor === "function"
                    ? column.accessor(row)
                    : column.accessor
                      ? renderValue(row[column.accessor])
                      : "-");

                return (
                  <td
                    className={cn(
                      "whitespace-nowrap px-4 py-3 text-app-primary",
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                      column.className,
                    )}
                    key={column.id}
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
