import type { ReactNode } from "react";
import { InboxIcon } from "@heroicons/react/24/outline";

export type TableEmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function TableEmptyState({
  title,
  description,
  action,
}: TableEmptyStateProps) {
  return (
    <div
      className="flex min-h-32 flex-col items-center justify-center px-4 py-7 text-center"
      role="status"
    >
      <span className="mb-2 grid size-10 place-items-center rounded-full bg-panel-muted text-muted">
        <InboxIcon aria-hidden="true" className="size-5" />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-sm text-muted">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function TableEmptyRow({
  colSpan,
  ...emptyState
}: TableEmptyStateProps & { colSpan: number }) {
  return (
    <tr>
      <td className="p-0" colSpan={colSpan}>
        <TableEmptyState {...emptyState} />
      </td>
    </tr>
  );
}
