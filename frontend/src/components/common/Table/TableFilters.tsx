import type { ReactNode } from "react";

interface TableFiltersProps {
  children: ReactNode;
}

export const TableFilters = ({ children }: TableFiltersProps) => (
  <div className="mb-4 flex flex-col gap-3 rounded-md border border-app-border bg-app-surface p-3 sm:flex-row sm:items-center">
    {children}
  </div>
);
