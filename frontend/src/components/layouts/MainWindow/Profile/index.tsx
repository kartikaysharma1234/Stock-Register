import { useAppContext } from "../../../../AppProvider/AppContext";

export const Profile = () => {
  const { user } = useAppContext();

  return (
    <div>
      <div className="text-sm font-medium text-app-primary">
        {user?.name ?? "Guest"}
      </div>
      <div className="text-xs text-app-muted">{user?.email ?? "Not signed in"}</div>
    </div>
  );
};
