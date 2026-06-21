import { Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PrimaryButton } from "../../components/common/Buttons";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { getRoute, request } from "../../service";
import { errorMessage, normalizeRecord, type ApiRecord, type FormValue } from "./dataUtils";
import { FieldRenderer } from "./FieldRenderer";
import type { FieldConfig } from "./moduleTypes";

const fields: FieldConfig[] = [
  { name: "name", label: "Organization name", required: true },
  { name: "slug", label: "Slug" },
  { name: "billingEmail", label: "Billing email", type: "email" },
  { name: "phone", label: "Phone" },
  { name: "gstin", label: "GSTIN" },
];

export const OrganizationSettingsPage = () => {
  const [form, setForm] = useState<Record<string, FormValue>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await request<unknown>(getRoute("organization.getMe"));
      const record = normalizeRecord(payload);
      setForm(
        fields.reduce<Record<string, FormValue>>((state, field) => {
          const value = record[field.name];
          state[field.name] =
            typeof value === "string" || typeof value === "number" || typeof value === "boolean"
              ? value
              : "";
          return state;
        }, {}),
      );
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to load organization"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(form).reduce<ApiRecord>((current, [key, value]) => {
        if (value !== "") current[key] = value;
        return current;
      }, {});
      await request<unknown>(getRoute("organization.updateMe"), { data: payload });
      toast.success("Organization updated");
      await load();
    } catch (requestError) {
      toast.error(errorMessage(requestError, "Unable to save organization"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        subtitle="Update tenant profile details used across billing and operations."
        title="Organization Settings"
      >
        <PrimaryButton leftIcon={<Save className="h-4 w-4" />} loading={saving} onClick={save}>
          Save
        </PrimaryButton>
      </PageHeader>
      {error ? (
        <EmptyState description={error} title="Organization unavailable" />
      ) : (
        <section className="max-w-3xl rounded-md border border-app-border bg-app-surface p-4">
          {loading ? (
            <div className="h-40 animate-pulse rounded-md bg-gray-100" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <FieldRenderer
                  field={field}
                  key={field.name}
                  onChange={(name, value) => setForm((current) => ({ ...current, [name]: value }))}
                  value={form[field.name]}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
