import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  divider?: boolean;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  backHref,
  backLabel = "Back",
  divider = true,
}: PageHeaderProps) {
  return (
    <div className={`mb-6 flex flex-col gap-4 print:hidden sm:flex-row sm:items-start sm:justify-between ${divider ? "border-b border-line pb-5" : ""}`}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="mb-1 text-xs font-medium text-muted">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold leading-snug text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 text-base leading-relaxed text-muted">{description}</p>}
      </div>
      {(backHref || actions) && (
        <div className={`flex flex-wrap items-center sm:shrink-0 ${backHref ? "gap-2" : "gap-3"}`}>
          {backHref && (
            <Link
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              href={backHref}
            >
              <ArrowLeftIcon aria-hidden="true" className="size-4" />
              {backLabel}
            </Link>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}
