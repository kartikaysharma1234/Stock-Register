import type { TextareaHTMLAttributes } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { cn } from "../../../utils/cn";

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  registration?: UseFormRegisterReturn;
}

export const FormTextarea = ({
  label,
  error,
  registration,
  className,
  id,
  ...props
}: FormTextareaProps) => {
  const textareaId = id ?? registration?.name ?? label;

  return (
    <label className="block" htmlFor={textareaId}>
      <span className="mb-1.5 block text-sm font-medium text-app-primary">
        {label}
      </span>
      <textarea
        id={textareaId}
        className={cn(
          "min-h-28 w-full resize-y rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-primary outline-none transition placeholder:text-gray-400 focus:border-app-accent focus:shadow-focus",
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
