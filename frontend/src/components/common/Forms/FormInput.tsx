import type { InputHTMLAttributes } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { cn } from "../../../utils/cn";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  registration?: UseFormRegisterReturn;
}

export const FormInput = ({
  label,
  error,
  registration,
  className,
  id,
  ...props
}: FormInputProps) => {
  const inputId = id ?? registration?.name ?? label;

  return (
    <label className="block" htmlFor={inputId}>
      <span className="mb-1.5 block text-sm font-medium text-app-primary">
        {label}
      </span>
      <input
        id={inputId}
        className={cn(
          "h-10 w-full rounded-md border border-app-border bg-app-surface px-3 text-sm text-app-primary outline-none transition placeholder:text-gray-400 focus:border-app-accent focus:shadow-focus",
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
