import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../../utils/cn";

interface SecondaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  leftIcon?: ReactNode;
}

export const SecondaryButton = ({
  children,
  className,
  loading = false,
  leftIcon,
  disabled,
  ...props
}: SecondaryButtonProps) => (
  <button
    className={cn(
      "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-app-border bg-app-surface px-4 text-sm font-medium text-app-primary transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60",
      className,
    )}
    disabled={disabled || loading}
    type="button"
    {...props}
  >
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
    {children}
  </button>
);
