import type { IPaginationMeta } from "../../../types";
import { SecondaryButton } from "../Buttons";

interface TablePaginationProps {
  meta: IPaginationMeta;
  onPageChange: (page: number) => void;
}

export const TablePagination = ({ meta, onPageChange }: TablePaginationProps) => {
  const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const end = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="mt-4 flex flex-col gap-3 text-sm text-app-muted sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {start} to {end} of {meta.total}
      </span>
      <div className="flex items-center gap-2">
        <SecondaryButton
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          Previous
        </SecondaryButton>
        <span className="px-2 text-app-primary">
          Page {meta.page} of {meta.totalPages}
        </span>
        <SecondaryButton
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
        </SecondaryButton>
      </div>
    </div>
  );
};
