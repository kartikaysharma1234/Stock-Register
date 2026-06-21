import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <div className="flex min-h-48 flex-col items-center justify-center rounded-md border border-dashed border-app-border bg-app-surface px-6 py-10 text-center">
    <h3 className="text-sm font-semibold text-app-primary">{title}</h3>
    {description ? (
      <p className="mt-2 max-w-md text-sm text-app-muted">{description}</p>
    ) : null}
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);
