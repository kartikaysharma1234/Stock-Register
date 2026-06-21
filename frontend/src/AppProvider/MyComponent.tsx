import { useAppContext } from "./AppContext";

export const MyComponent = () => {
  const { organization } = useAppContext();
  return (
    <span className="text-sm text-app-muted">
      {organization?.name ?? "StockManager"}
    </span>
  );
};
