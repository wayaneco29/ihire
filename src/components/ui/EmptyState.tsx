import type { ReactNode } from "react";
import { SurfaceCard } from "./SurfaceCard";
import { cn } from "@/utils/cn";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  iconClassName?: string;
  contentClassName?: string;
  headingClassName?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  iconClassName,
  contentClassName,
  headingClassName,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <SurfaceCard
      as="section"
      aria-label={title}
      className={cn(
        "border-none",
        compact
          ? "min-h-0 place-items-stretch border-profile-line bg-transparent px-3 py-3 text-left shadow-none"
          : "grid min-h-64 place-items-center px-6 py-10 text-center shadow-none",
        className,
      )}
      tone={compact ? "default" : "muted"}
    >
      <div
        className={cn(
          "max-w-full",
          compact && "flex flex-col items-center gap-3",
          contentClassName,
        )}
      >
        {icon && (
          <div
            aria-hidden="true"
            className={cn(
              "mx-auto mb-4 grid size-12 place-items-center rounded-sm bg-primary-light text-xl text-primary",
              compact && "mb-0 size-7 shrink-0 rounded-sm text-base",
              iconClassName,
            )}
          >
            {icon}
          </div>
        )}
        <div className={cn(compact && "min-w-0")}>
          <h2
            className={cn(
              "text-base font-normal text-muted",
              compact && "text-sm font-normal",
              headingClassName,
            )}
          >
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
          )}
          {action && <div className="mt-5">{action}</div>}
        </div>
      </div>
    </SurfaceCard>
  );
}
