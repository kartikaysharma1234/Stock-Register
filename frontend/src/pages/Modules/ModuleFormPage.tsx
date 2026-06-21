import { ArrowLeft, Save } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PrimaryButton, SecondaryButton } from "../../components/common/Buttons";
import { PageHeader } from "../../components/common/PageHeader";
import { getRoute, request } from "../../service";
import { buildPayload, errorMessage, type FormState, type FormValue } from "./dataUtils";
import { FieldRenderer, initialFormState } from "./FieldRenderer";
import type { ModuleConfig } from "./moduleTypes";

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
  const [submitting, setSubmitting] = useState(false);

  const jsonFields = useMemo(
    () => fields.filter((field) => field.type === "json").map((field) => field.name),
    [fields],
  );
  const numberFields = useMemo(
    () => fields.filter((field) => field.type === "number").map((field) => field.name),
    [fields],
  );
  const booleanFields = useMemo(
    () => fields.filter((field) => field.type === "checkbox").map((field) => field.name),
    [fields],
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
          {fields.map((field) => (
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
