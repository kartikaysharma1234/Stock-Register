import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "../Buttons";

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onExport?: () => void;
}

export const ChartContainer = ({
  title,
  subtitle,
  children,
  onExport,
}: ChartContainerProps) => (
  <section className="rounded-md border border-app-border bg-app-surface">
    <div className="flex items-start justify-between border-b border-app-border px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold text-app-primary">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-app-muted">{subtitle}</p> : null}
      </div>
      {onExport ? (
        <IconButton ariaLabel={`Export ${title}`} onClick={onExport}>
          <Download className="h-4 w-4" />
        </IconButton>
      ) : null}
    </div>
    <div className="p-4">{children}</div>
  </section>
);
