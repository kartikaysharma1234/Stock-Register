import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PrimaryButton, SecondaryButton } from "../../components/common/Buttons";
import { PageHeader } from "../../components/common/PageHeader";
import { getRoute, request } from "../../service";
import {
  buildPayload,
  errorMessage,
  formatCell,
  getRecordId,
  getValue,
  normalizeRows,
  type FormState,
  type FormValue,
} from "./dataUtils";
import { FieldRenderer, initialFormState } from "./FieldRenderer";
import type { FieldConfig, ModuleConfig } from "./moduleTypes";

interface ModuleFormPageProps {
  config: ModuleConfig;
  mode?: "create" | "edit";
  backTo: string;
}

export const ModuleFormPage = ({ config, mode = "create", backTo }: ModuleFormPageProps) => {
  const navigate = useNavigate();
  const params = useParams();
  const fields = config.fields ?? [];
  const [form, setForm] = useState<FormState>(() => initialFormState(fields));
  const [dynamicOptions, setDynamicOptions] = useState<
    Record<string, Array<{ label: string; value: string }>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fieldsWithDynamicOptions = fields.filter((field) => field.dynamicOptions);
    if (fieldsWithDynamicOptions.length === 0) return;

    let isCurrent = true;

    const loadOptions = async () => {
      const entries = await Promise.all(
        fieldsWithDynamicOptions.map(async (field) => {
          const source = field.dynamicOptions;
          if (!source) return [field.name, field.options ?? []] as const;

          const payload = await request<unknown>(getRoute(source.routeKey), {
            query: {
              page: 1,
              limit: 100,
              ...(source.query ?? {}),
            },
          });

          const options = normalizeRows(payload)
            .map((row) => {
              const configuredValue = source.valueKey
                ? getValue(row, source.valueKey)
                : undefined;
              const rawValue = configuredValue ?? getRecordId(row);
              const value =
                typeof rawValue === "string" ? rawValue : String(rawValue ?? "");
              const rawLabel = source.labelKey
                ? getValue(row, source.labelKey)
                : row.name ?? row.code ?? value;
              return {
                label: formatCell(rawLabel),
                value,
              };
            })
            .filter((option) => option.value);

          return [
            field.name,
            [
              { label: field.placeholder ?? `Select ${field.label}`, value: "" },
              ...options,
            ],
          ] as const;
        }),
      );

      if (!isCurrent) return;
      setDynamicOptions(Object.fromEntries(entries));
    };

    void loadOptions().catch((requestError) => {
      toast.error(errorMessage(requestError, "Unable to load form options"));
    });

    return () => {
      isCurrent = false;
    };
  }, [fields]);

  const resolvedFields = useMemo<FieldConfig[]>(
    () =>
      fields.map((field) =>
        dynamicOptions[field.name]
          ? {
              ...field,
              type: "select",
              options: dynamicOptions[field.name],
            }
          : field,
      ),
    [dynamicOptions, fields],
  );

  const jsonFields = useMemo(
    () => resolvedFields.filter((field) => field.type === "json").map((field) => field.name),
    [resolvedFields],
  );
  const numberFields = useMemo(
    () => resolvedFields.filter((field) => field.type === "number").map((field) => field.name),
    [resolvedFields],
  );
  const booleanFields = useMemo(
    () => resolvedFields.filter((field) => field.type === "checkbox").map((field) => field.name),
    [resolvedFields],
  );

  const routeKey = mode === "edit" ? config.updateRouteKey : config.createRouteKey;

  const setValue = (name: string, value: FormValue) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submit = async () => {
    if (!routeKey) return;
    setSubmitting(true);
    try {
      await request<unknown>(getRoute(routeKey), {
        params: { id: params.id ?? "" },
        data: buildPayload(form, jsonFields, numberFields, booleanFields),
      });
      toast.success(`${config.title} saved`);
      navigate(backTo);
    } catch (requestError) {
      toast.error(errorMessage(requestError, `Unable to save ${config.title}`));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        subtitle={mode === "create" ? config.subtitle : `Update ${config.title.toLowerCase()} record`}
        title={mode === "create" ? `New ${config.title}` : `Edit ${config.title}`}
      >
        <Link to={backTo}>
          <SecondaryButton leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </SecondaryButton>
        </Link>
        <PrimaryButton
          leftIcon={<Save className="h-4 w-4" />}
          loading={submitting}
          onClick={submit}
        >
          Save
        </PrimaryButton>
      </PageHeader>

      <section className="max-w-3xl rounded-md border border-app-border bg-app-surface p-4">
        <div className="grid gap-4 md:grid-cols-2">
          {resolvedFields.map((field) => (
            <div
              className={field.type === "textarea" || field.type === "json" ? "md:col-span-2" : ""}
              key={field.name}
            >
              <FieldRenderer
                field={field}
                onChange={setValue}
                value={form[field.name]}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
