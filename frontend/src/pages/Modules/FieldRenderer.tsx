import { FormDatePicker, FormInput, FormSelect, FormTextarea } from "../../components/common/Forms";
import type { FieldConfig } from "./moduleTypes";
import type { FormState, FormValue } from "./dataUtils";

interface FieldRendererProps {
  field: FieldConfig;
  value: FormValue | undefined;
  onChange: (name: string, value: FormValue) => void;
}

export const FieldRenderer = ({ field, value, onChange }: FieldRendererProps) => {
  const common = {
    label: field.label,
    placeholder: field.placeholder,
    required: field.required,
  };

  if (field.type === "select") {
    return (
      <FormSelect
        {...common}
        onChange={(event) => onChange(field.name, event.target.value)}
        options={field.options ?? []}
        value={String(value ?? "")}
      />
    );
  }

  if (field.type === "textarea" || field.type === "json") {
    return (
      <div>
        <FormTextarea
          {...common}
          onChange={(event) => onChange(field.name, event.target.value)}
          value={String(value ?? "")}
        />
        {field.helper ? (
          <p className="mt-1 text-xs text-app-muted">{field.helper}</p>
        ) : null}
      </div>
    );
  }

  if (field.type === "date") {
    return (
      <FormDatePicker
        {...common}
        onChange={(event) => onChange(field.name, event.target.value)}
        value={String(value ?? "")}
      />
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-primary">
        <input
          checked={Boolean(value)}
          className="h-4 w-4 rounded border-app-border text-app-accent"
          onChange={(event) => onChange(field.name, event.target.checked)}
          type="checkbox"
        />
        {field.label}
      </label>
    );
  }

  return (
    <FormInput
      {...common}
      onChange={(event) =>
        onChange(
          field.name,
          field.type === "number" ? Number(event.target.value) : event.target.value,
        )
      }
      type={field.type ?? "text"}
      value={String(value ?? "")}
    />
  );
};

export const initialFormState = (fields: FieldConfig[] = []) =>
  fields.reduce<FormState>((state, field) => {
    state[field.name] = field.defaultValue ?? (field.type === "checkbox" ? false : "");
    return state;
  }, {});
