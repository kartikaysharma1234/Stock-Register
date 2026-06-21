import { Bell } from "lucide-react";

export const NotificationNavbar = () => (
  <div className="flex items-center gap-2 text-sm text-app-muted">
    <Bell className="h-4 w-4" />
    No unread alerts
  </div>
);
