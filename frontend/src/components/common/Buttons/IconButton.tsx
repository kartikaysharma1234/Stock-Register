import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../../utils/cn";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ariaLabel: string;
  children: ReactNode;
}

export const IconButton = ({
  ariaLabel,
  children,
  className,
  ...props
}: IconButtonProps) => (
  <button
    aria-label={ariaLabel}
    className={cn(
      "inline-flex h-9 w-9 items-center justify-center rounded-md border border-app-border bg-app-surface text-app-muted transition hover:bg-gray-50 hover:text-app-primary",
      className,
    )}
    type="button"
    {...props}
  >
    {children}
  </button>
);
