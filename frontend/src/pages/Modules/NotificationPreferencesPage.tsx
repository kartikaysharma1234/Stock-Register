import { Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PrimaryButton } from "../../components/common/Buttons";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { getRoute, request } from "../../service";
import { errorMessage, normalizeRecord } from "./dataUtils";

const channels = ["IN_APP", "EMAIL", "WHATSAPP"];
const types = ["SYSTEM", "PASSWORD_RESET", "STOCK_LOW", "REQUEST", "PURCHASE", "ASSET", "REPORT_READY"];

export const NotificationPreferencesPage = () => {
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const record = normalizeRecord(await request<unknown>(getRoute("notifications.getPreferences")));
      const preferences = record.preferences;
      if (Array.isArray(preferences)) {
        const next: Record<string, string[]> = {};
        preferences.forEach((entry) => {
          if (entry && typeof entry === "object" && "type" in entry && "channels" in entry) {
            const type = String(entry.type);
            next[type] = Array.isArray(entry.channels)
              ? entry.channels.map(String)
              : [];
          }
        });
        setSelected(next);
      }
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to load notification preferences"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (type: string, channel: string) => {
    setSelected((current) => {
      const active = new Set(current[type] ?? []);
      if (active.has(channel)) active.delete(channel);
      else active.add(channel);
      return { ...current, [type]: [...active] };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await request<unknown>(getRoute("notifications.updatePreferences"), {
        data: {
          preferences: types.map((type) => ({
            type,
            channels: selected[type] ?? ["IN_APP"],
          })),
        },
      });
      toast.success("Notification preferences saved");
    } catch (requestError) {
      toast.error(errorMessage(requestError, "Unable to save preferences"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        subtitle="Choose delivery channels for operational notifications."
        title="Notification Settings"
      >
        <PrimaryButton leftIcon={<Save className="h-4 w-4" />} loading={saving} onClick={save}>
          Save
        </PrimaryButton>
      </PageHeader>
      {error ? (
        <EmptyState description={error} title="Preferences unavailable" />
      ) : (
        <section className="rounded-md border border-app-border bg-app-surface">
          {loading ? (
            <div className="m-4 h-52 animate-pulse rounded-md bg-gray-100" />
          ) : (
            <div className="divide-y divide-app-border">
              {types.map((type) => (
                <div className="grid gap-3 p-4 md:grid-cols-[220px_1fr]" key={type}>
                  <div>
                    <div className="text-sm font-semibold text-app-primary">
                      {type.replace(/_/g, " ")}
                    </div>
                    <div className="text-xs text-app-muted">Delivery channels</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {channels.map((channel) => (
                      <label
                        className="inline-flex items-center gap-2 rounded-md border border-app-border px-3 py-2 text-sm"
                        key={channel}
                      >
                        <input
                          checked={(selected[type] ?? []).includes(channel)}
                          onChange={() => toggle(type, channel)}
                          type="checkbox"
                        />
                        {channel.replace(/_/g, " ")}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
