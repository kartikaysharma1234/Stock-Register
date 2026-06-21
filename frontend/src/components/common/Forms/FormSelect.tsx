import type { SelectHTMLAttributes } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { cn } from "../../../utils/cn";

export interface SelectOption {
  label: string;
  value: string;
}

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: SelectOption[];
  registration?: UseFormRegisterReturn;
}

export const FormSelect = ({
  label,
  error,
  options,
  registration,
  className,
  id,
  ...props
}: FormSelectProps) => {
  const selectId = id ?? registration?.name ?? label;

  return (
    <label className="block" htmlFor={selectId}>
      <span className="mb-1.5 block text-sm font-medium text-app-primary">
        {label}
      </span>
      <select
        id={selectId}
        className={cn(
          "h-10 w-full rounded-md border border-app-border bg-app-surface px-3 text-sm text-app-primary outline-none transition focus:border-app-accent focus:shadow-focus",
          error && "border-app-error",
          className,
        )}
        {...registration}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="mt-1 block text-xs text-app-error">{error}</span> : null}
    </label>
  );
};
