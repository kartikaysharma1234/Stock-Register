import { Clock3 } from "lucide-react";

export const ProcessScheduler = () => (
  <div className="flex items-center gap-2 text-sm text-app-muted">
    <Clock3 className="h-4 w-4" />
    Background jobs scheduled
  </div>
);
