import type { ReactNode } from "react";
import { SurfaceCard } from "./SurfaceCard";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <SurfaceCard
      as="section"
      aria-label={title}
      className="grid min-h-64 place-items-center border-dashed border-line-strong px-6 py-10 text-center shadow-none"
      tone="muted"
    >
      <div className="max-w-md">
        {icon && (
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-primary-light text-xl text-primary">
            {icon}
          </div>
        )}
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </SurfaceCard>
  );
}
