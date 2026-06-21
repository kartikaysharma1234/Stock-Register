import { cn } from "../../utils/cn";

const toneByStatus: Record<string, string> = {
  ACTIVE: "bg-app-success",
  APPROVED: "bg-app-success",
  FULFILLED: "bg-app-success",
  PENDING: "bg-app-warning",
  DEPT_APPROVED: "bg-app-warning",
  STORE_APPROVED: "bg-app-warning",
  PARTIALLY_FULFILLED: "bg-app-warning",
  REJECTED: "bg-app-error",
  CANCELLED: "bg-app-error",
  DRAFT: "bg-gray-400",
  INACTIVE: "bg-gray-400",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const formatStatus = (status: string) =>
  status
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

export const StatusBadge = ({ status, className }: StatusBadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-md border border-app-border bg-app-surface px-2 py-1 text-xs font-medium text-app-muted",
      className,
    )}
  >
    <span
      className={cn(
        "h-1.5 w-1.5 rounded-full",
        toneByStatus[status] ?? "bg-gray-400",
      )}
    />
    {formatStatus(status)}
  </span>
);
