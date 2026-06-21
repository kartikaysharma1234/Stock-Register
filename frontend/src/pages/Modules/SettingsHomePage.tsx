import { Bell, Building2, CreditCard, KeyRound, Settings, Shield, Users, Webhook } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";

const cards = [
  ["Organization", "/settings/organization", Building2, "Profile, billing email, and tenant details"],
  ["Users", "/settings/users", Users, "Invite users and maintain access"],
  ["Roles", "/settings/roles", Shield, "Custom roles and permission groups"],
  ["Billing", "/settings/billing", CreditCard, "Plan, usage, and upgrade workflow"],
  ["API Keys", "/settings/api-keys", KeyRound, "Integration credentials and scopes"],
  ["Webhooks", "/settings/webhooks", Webhook, "Outbound events and deliveries"],
  ["Notifications", "/settings/notifications", Bell, "User delivery preferences"],
];

export const SettingsHomePage = () => (
  <div>
    <PageHeader
      subtitle="Tenant setup, access control, integrations, billing, and preferences."
      title="Settings"
    />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map(([label, to, Icon, description]) => (
        <Link
          className="rounded-md border border-app-border bg-app-surface p-4 transition hover:border-app-accent"
          key={String(to)}
          to={String(to)}
        >
          <Icon className="h-5 w-5 text-app-accent" />
          <div className="mt-4 text-sm font-semibold text-app-primary">{String(label)}</div>
          <div className="mt-1 text-sm text-app-muted">{String(description)}</div>
        </Link>
      ))}
    </div>
  </div>
);
