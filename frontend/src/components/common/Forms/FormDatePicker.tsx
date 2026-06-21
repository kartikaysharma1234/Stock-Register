import type { InputHTMLAttributes } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { cn } from "../../../utils/cn";

interface FormDatePickerProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  registration?: UseFormRegisterReturn;
}

export const FormDatePicker = ({
  label,
  error,
  registration,
  className,
  id,
  ...props
}: FormDatePickerProps) => {
  const inputId = id ?? registration?.name ?? label;

  return (
    <label className="block" htmlFor={inputId}>
      <span className="mb-1.5 block text-sm font-medium text-app-primary">
        {label}
      </span>
      <input
        id={inputId}
        type="date"
        className={cn(
          "h-10 w-full rounded-md border border-app-border bg-app-surface px-3 text-sm text-app-primary outline-none transition focus:border-app-accent focus:shadow-focus",
          error && "border-app-error",
          className,
        )}
        {...registration}
        {...props}
      />
      {error ? <span className="mt-1 block text-xs text-app-error">{error}</span> : null}
    </label>
  );
};
