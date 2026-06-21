import { useParams } from "react-router-dom";
import { ModuleListPage } from "./ModuleListPage";
import type { RelationConfig } from "./moduleTypes";

interface RelationPageProps {
  config: RelationConfig;
}

export const RelationPage = ({ config }: RelationPageProps) => {
  const params = useParams();
  return <ModuleListPage config={config} routeParams={config.routeParams(params)} />;
};
