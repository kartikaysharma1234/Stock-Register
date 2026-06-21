import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export const PageHeader = ({ title, subtitle, children }: PageHeaderProps) => (
  <div className="mb-6 flex flex-col gap-4 border-b border-app-border pb-5 md:flex-row md:items-end md:justify-between">
    <div>
      <h1 className="text-2xl font-semibold tracking-normal text-app-primary">
        {title}
      </h1>
      {subtitle ? <p className="mt-1 text-sm text-app-muted">{subtitle}</p> : null}
    </div>
    {children ? (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {children}
      </div>
    ) : null}
  </div>
);
