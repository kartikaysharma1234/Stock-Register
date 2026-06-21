import { useAppContext } from "../AppProvider/AppContext";

export const usePermissions = () => {
  const { hasPermission, user } = useAppContext();

  return {
    user,
    hasPermission,
    hasEveryPermission: (permissions: string[]) =>
      permissions.every((permission) => hasPermission(permission)),
    hasSomePermission: (permissions: string[]) =>
      permissions.some((permission) => hasPermission(permission)),
  };
};
