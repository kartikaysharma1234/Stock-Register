import { Bell, LogOut, Menu, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../../../AppProvider/AppContext";
import { env } from "../../../../utils/env";
import { IconButton } from "../../../common/Buttons";

interface NavbarProps {
  onOpenSidebar: () => void;
}

export const Navbar = ({ onOpenSidebar }: NavbarProps) => {
  const { user, organization, clearSession } = useAppContext();
  const navigate = useNavigate();

  const logout = () => {
    clearSession();
    navigate("/auth/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-app-border bg-app-background/95 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <IconButton
          ariaLabel="Open navigation"
          className="md:hidden"
          onClick={onOpenSidebar}
        >
          <Menu className="h-4 w-4" />
        </IconButton>
        <label className="relative hidden max-w-md flex-1 md:block">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
          <input
            className="h-10 w-full rounded-md border border-app-border bg-app-surface pl-9 pr-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-app-accent focus:shadow-focus"
            placeholder="Search items, requests, vendors"
            type="search"
          />
        </label>
        <div className="ml-auto flex items-center gap-2">
          <IconButton ariaLabel="Notifications">
            <Bell className="h-4 w-4" />
          </IconButton>
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium text-app-primary">
              {user?.name ?? env.appName}
            </div>
            <div className="text-xs text-app-muted">
              {organization?.name ?? user?.role ?? "No organization"}
            </div>
          </div>
          <IconButton ariaLabel="Sign out" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
    </header>
  );
};
