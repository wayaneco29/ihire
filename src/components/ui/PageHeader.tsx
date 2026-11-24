import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 print:hidden sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="mb-1 text-xs font-medium text-muted">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold leading-snug text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 text-base leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3 sm:shrink-0">{actions}</div>}
    </div>
  );
}
