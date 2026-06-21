import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";

interface PlaceholderPageProps {
  title: string;
  subtitle?: string;
  moduleName?: string;
}

export const PlaceholderPage = ({
  title,
  subtitle,
  moduleName,
}: PlaceholderPageProps) => (
  <div>
    <PageHeader
      subtitle={subtitle ?? "This page is reserved for the next frontend module."}
      title={title}
    />
    <EmptyState
      description={`${moduleName ?? title} will use the shared service, route map, tables, forms, and permission gates from the foundation module.`}
      title={`${title} workspace is ready`}
    />
  </div>
);
