import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { create } from "zustand";
import type { IOrganization, IUser } from "../types";
import { tokenStorage } from "../service";

type Theme = "light";

interface StoredSession {
  user: IUser | null;
  organization: IOrganization | null;
}

interface AppStore extends StoredSession {
  theme: Theme;
  setSession: (user: IUser, organization?: IOrganization | null) => void;
  setOrganization: (organization: IOrganization | null) => void;
  clearSession: () => void;
}

interface AppContextValue extends AppStore {
  isAuthenticated: boolean;
  hasPermission: (permission?: string) => boolean;
}

const readStorage = <T,>(key: string): T | null => {
  const value = localStorage.getItem(key);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

export const useAppStore = create<AppStore>((set) => ({
  user: readStorage<IUser>("currentUser"),
  organization: readStorage<IOrganization>("currentOrganization"),
  theme: "light",
  setSession: (user, organization = null) => {
    localStorage.setItem("currentUser", JSON.stringify(user));
    if (organization) {
      localStorage.setItem("currentOrganization", JSON.stringify(organization));
    }
    set({ user, organization });
  },
  setOrganization: (organization) => {
    if (organization) {
      localStorage.setItem("currentOrganization", JSON.stringify(organization));
    } else {
      localStorage.removeItem("currentOrganization");
    }
    set({ organization });
  },
  clearSession: () => {
    tokenStorage.clear();
    set({ user: null, organization: null });
  },
}));

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const user = useAppStore((state) => state.user);
  const organization = useAppStore((state) => state.organization);
  const theme = useAppStore((state) => state.theme);
  const setSession = useAppStore((state) => state.setSession);
  const setOrganization = useAppStore((state) => state.setOrganization);
  const clearSession = useAppStore((state) => state.clearSession);

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      organization,
      theme,
      setSession,
      setOrganization,
      clearSession,
      isAuthenticated: Boolean(user && tokenStorage.getAccessToken()),
      hasPermission: (permission) => {
        if (!permission) return true;
        if (!user) return false;
        if (user.role === "SUPER_ADMIN" || user.role === "ORG_ADMIN") return true;
        return user.permissions.includes(permission);
      },
    }),
    [clearSession, organization, setOrganization, setSession, theme, user],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used inside AppProvider");
  }
  return context;
};
