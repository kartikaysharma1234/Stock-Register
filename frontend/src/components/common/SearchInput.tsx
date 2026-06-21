import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export const SearchInput = ({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) => (
  <label className="relative block">
    <span className="sr-only">Search</span>
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
    <input
      className={cn(
        "h-10 w-full rounded-md border border-app-border bg-app-surface pl-9 pr-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-app-accent focus:shadow-focus sm:w-72",
        className,
      )}
      placeholder="Search records"
      type="search"
      {...props}
    />
  </label>
);
