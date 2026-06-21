import { useAppContext } from "../AppProvider/AppContext";

export const usePermission = (permission?: string) => {
  const { hasPermission } = useAppContext();
  return hasPermission(permission);
};
