import type { ReactNode } from "react";

export type SkeletonVariant =
  | "auth"
  | "register"
  | "invite"
  | "dashboard"
  | "table"
  | "cards"
  | "form"
  | "detail"
  | "split-detail"
  | "documents"
  | "queue"
  | "schedule"
  | "review"
  | "profile";

type SkeletonLoaderProps = {
  label?: string;
  rows?: number;
  showAction?: boolean;
  variant?: SkeletonVariant;
};

function Pulse({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-sm bg-panel-muted ${className}`}
    />
  );
}

function Panel({
  children,
  className = "p-5 sm:p-6",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-sm border border-line bg-panel shadow-card ${className}`}>
      {children}
    </div>
  );
}

function PageHeading({ showAction }: { showAction: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-3">
        <Pulse className="h-7 w-2/5" />
        <Pulse className="h-4 w-4/5" />
      </div>
      {showAction ? <Pulse className="h-11 w-36 rounded-md" /> : null}
    </div>
  );
}

function RepeatedRows({ rows }: { rows: number }) {
  return Array.from({ length: rows }, (_, index) => (
    <div
      className="flex items-center gap-4 border-t border-line-subtle py-4 first:border-t-0"
      key={index}
    >
      <Pulse className="size-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Pulse className="h-4 w-2/5" />
        <Pulse className="h-3 w-3/5" />
      </div>
      <Pulse className="hidden h-4 w-1/6 sm:block" />
      <Pulse className="h-9 w-20 shrink-0 rounded-md" />
    </div>
  ));
}

function AuthSkeleton({ fields }: { fields: number }) {
  return (
    <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/80 bg-panel shadow-card md:min-h-[600px] md:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 lg:px-14">
        <div className="mb-8 flex items-center gap-3">
          <Pulse className="size-11 shrink-0 rounded-full" />
          <div className="space-y-2">
            <Pulse className="h-3 w-28" />
            <Pulse className="h-4 w-36" />
          </div>
        </div>
        <div className="space-y-4">
          <Pulse className="h-8 w-3/5" />
          <Pulse className="h-4 w-full" />
          <Pulse className="h-4 w-4/5" />
          <div className="space-y-4 pt-4">
            {Array.from({ length: fields }, (_, index) => (
              <Pulse className="h-12 w-full rounded-md" key={index} />
            ))}
            <Pulse className="h-11 w-full rounded-md" />
          </div>
          <Pulse className="mx-auto h-4 w-3/5" />
        </div>
      </div>
      <aside className="relative flex min-h-64 flex-col justify-end gap-4 overflow-hidden bg-panel-muted p-6 md:min-h-full sm:p-8">
        <Pulse className="h-3 w-2/5 bg-panel" />
        <Pulse className="h-8 w-4/5 bg-panel" />
        <Pulse className="h-4 w-full bg-panel" />
        <Pulse className="h-4 w-3/4 bg-panel" />
      </aside>
    </div>
  );
}

function InviteSkeleton() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-7 flex justify-center">
          <Pulse className="h-12 w-52 rounded-md" />
        </div>
        <Panel className="space-y-5 p-6 sm:p-8">
          <Pulse className="h-7 w-3/5" />
          <Pulse className="h-4 w-full" />
          <Pulse className="h-4 w-4/5" />
          <div className="space-y-3 border-y border-line-subtle py-4">
            <Pulse className="h-4 w-4/5" />
            <Pulse className="h-4 w-3/5" />
          </div>
          <Pulse className="h-11 w-full rounded-md" />
          <Pulse className="h-11 w-full rounded-md" />
          <Pulse className="h-11 w-full rounded-md" />
        </Panel>
      </div>
    </main>
  );
}

function DashboardSkeleton({ rows }: { rows: number }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Panel className="space-y-4 p-5" key={index}>
            <Pulse className="h-4 w-2/5" />
            <Pulse className="h-8 w-1/3" />
            <Pulse className="h-3 w-3/5" />
          </Panel>
        ))}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,0.8fr)]">
        <Panel>
          <div className="mb-3 space-y-3">
            <Pulse className="h-5 w-2/5" />
            <Pulse className="h-4 w-3/5" />
          </div>
          <RepeatedRows rows={rows} />
        </Panel>
        <Panel>
          <Pulse className="mb-5 h-5 w-3/5" />
          <div className="space-y-5">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="space-y-2" key={index}>
                <Pulse className="h-4 w-2/5" />
                <Pulse className="h-3 w-full" />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Pulse className="h-10 min-w-48 flex-1 rounded-md" />
        <Pulse className="h-10 w-32 rounded-md" />
        <Pulse className="h-10 w-28 rounded-md" />
      </div>
      <Panel className="overflow-hidden p-0">
        <div className="grid grid-cols-4 gap-4 border-b border-line-subtle bg-panel-muted/50 px-5 py-4 sm:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Pulse className="h-3 w-4/5" key={index} />
          ))}
        </div>
        <div className="divide-y divide-line-subtle px-5">
          {Array.from({ length: rows }, (_, index) => (
            <div className="grid grid-cols-4 items-center gap-4 py-4 sm:grid-cols-5" key={index}>
              <div className="space-y-2">
                <Pulse className="h-4 w-4/5" />
                <Pulse className="h-3 w-3/5" />
              </div>
              <Pulse className="hidden h-4 w-4/5 sm:block" />
              <Pulse className="h-6 w-3/5 rounded-full" />
              <Pulse className="hidden h-4 w-3/5 sm:block" />
              <Pulse className="h-9 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function CardsSkeleton({ rows }: { rows: number }) {
  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Pulse className="h-10 min-w-48 flex-1 rounded-md" />
        <Pulse className="h-10 w-32 rounded-md" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: rows }, (_, index) => (
          <Panel className="space-y-4" key={index}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <Pulse className="h-5 w-3/5" />
                <Pulse className="h-4 w-2/5" />
              </div>
              <Pulse className="h-7 w-24 rounded-full" />
            </div>
            <Pulse className="h-4 w-full" />
            <Pulse className="h-4 w-4/5" />
            <div className="flex justify-between border-t border-line-subtle pt-4">
              <Pulse className="h-4 w-1/3" />
              <Pulse className="h-9 w-28 rounded-md" />
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}

function FormSkeleton({ rows }: { rows: number }) {
  return (
    <Panel className="space-y-7">
      {Array.from({ length: rows }, (_, sectionIndex) => (
        <div
          className="space-y-5 border-b border-line-subtle pb-6 last:border-b-0 last:pb-0"
          key={sectionIndex}
        >
          <div className="space-y-2">
            <Pulse className="h-5 w-2/5" />
            <Pulse className="h-3 w-3/5" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, fieldIndex) => (
              <div className="space-y-2" key={fieldIndex}>
                <Pulse className="h-3 w-1/3" />
                <Pulse className="h-11 w-full rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-end gap-3">
        <Pulse className="h-10 w-24 rounded-md" />
        <Pulse className="h-10 w-32 rounded-md" />
      </div>
    </Panel>
  );
}

function DetailSkeleton({ rows }: { rows: number }) {
  return (
    <>
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <Pulse className="h-7 w-2/5" />
            <Pulse className="h-4 w-3/5" />
          </div>
          <Pulse className="h-9 w-28 rounded-full" />
        </div>
        <div className="mt-6 grid gap-4 border-t border-line-subtle pt-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="space-y-2" key={index}>
              <Pulse className="h-3 w-2/5" />
              <Pulse className="h-4 w-4/5" />
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <Pulse className="mb-5 h-5 w-2/5" />
        <RepeatedRows rows={rows} />
      </Panel>
      <Panel className="space-y-4">
        <Pulse className="h-5 w-1/3" />
        <Pulse className="h-4 w-full" />
        <Pulse className="h-4 w-5/6" />
        <Pulse className="h-4 w-2/3" />
      </Panel>
    </>
  );
}

function SplitDetailSkeleton() {
  return (
    <>
      <Panel className="flex items-start gap-4">
        <Pulse className="size-11 shrink-0 rounded-full" />
        <div className="flex-1 space-y-3">
          <Pulse className="h-5 w-2/5" />
          <Pulse className="h-4 w-4/5" />
        </div>
      </Panel>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(16rem,0.8fr)]">
        <div className="space-y-5">
          {Array.from({ length: 3 }, (_, index) => (
            <Panel className="space-y-4" key={index}>
              <Pulse className="h-5 w-2/5" />
              <Pulse className="h-4 w-full" />
              <Pulse className="h-4 w-5/6" />
              <Pulse className="h-4 w-2/3" />
            </Panel>
          ))}
        </div>
        <div className="space-y-5">
          <Panel className="space-y-4">
            <Pulse className="h-5 w-3/5" />
            {Array.from({ length: 4 }, (_, index) => (
              <Pulse className="h-4 w-full" key={index} />
            ))}
          </Panel>
          <Panel className="space-y-4">
            <Pulse className="h-5 w-2/5" />
            <Pulse className="h-10 w-full rounded-md" />
          </Panel>
        </div>
      </div>
    </>
  );
}

function DocumentsSkeleton({ rows }: { rows: number }) {
  return (
    <>
      <Panel>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="flex items-center gap-3" key={index}>
              <Pulse className="size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Pulse className="h-4 w-3/5" />
                <Pulse className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Pulse className="h-5 w-2/5" />
          <Pulse className="h-4 w-4/5" />
        </div>
        <Pulse className="h-10 w-32 rounded-md" />
      </Panel>
      <div className="space-y-4">
        {Array.from({ length: rows }, (_, index) => (
          <Panel className="flex flex-wrap items-center gap-4" key={index}>
            <Pulse className="size-10 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Pulse className="h-4 w-2/5" />
              <Pulse className="h-3 w-3/5" />
            </div>
            <Pulse className="h-7 w-24 rounded-full" />
            <Pulse className="h-9 w-24 rounded-md" />
          </Panel>
        ))}
      </div>
    </>
  );
}

function QueueSkeleton({ rows }: { rows: number }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Panel className="space-y-3 p-5" key={index}>
            <Pulse className="h-3 w-2/5" />
            <Pulse className="h-7 w-1/3" />
          </Panel>
        ))}
      </div>
      <Panel className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line-subtle p-5">
          <div className="flex-1 space-y-3">
            <Pulse className="h-5 w-2/5" />
            <Pulse className="h-4 w-3/5" />
          </div>
          <Pulse className="h-10 w-36 rounded-md" />
        </div>
        <div className="divide-y divide-line-subtle px-5">
          {Array.from({ length: rows }, (_, index) => (
            <div className="flex flex-wrap items-center gap-4 py-4" key={index}>
              <Pulse className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Pulse className="h-4 w-2/5" />
                <Pulse className="h-3 w-4/5" />
              </div>
              <Pulse className="h-7 w-24 rounded-full" />
              <Pulse className="h-9 w-24 rounded-md" />
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function ScheduleSkeleton() {
  return (
    <>
      <Panel>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <Pulse className="h-5 w-44" />
            <Pulse className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Pulse className="h-10 w-20 rounded-md" />
            <Pulse className="h-10 w-28 rounded-md" />
            <Pulse className="h-10 w-20 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }, (_, index) => (
            <Pulse className="h-14 rounded-md sm:h-20" key={index} />
          ))}
        </div>
      </Panel>
      <Panel>
        <Pulse className="mb-4 h-5 w-2/5" />
        <RepeatedRows rows={3} />
      </Panel>
    </>
  );
}

function ReviewSkeleton({ rows }: { rows: number }) {
  return (
    <>
      <Panel className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <Pulse className="size-10 shrink-0 rounded-sm" />
          <div className="flex-1 space-y-2">
            <Pulse className="h-5 w-2/5" />
            <Pulse className="h-3 w-3/5" />
          </div>
        </div>
        <Pulse className="h-8 w-28 rounded-full" />
      </Panel>
      <Panel className="space-y-5">
        <Pulse className="h-5 w-2/5" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="space-y-2" key={index}>
              <Pulse className="h-3 w-1/3" />
              <Pulse className="h-4 w-4/5" />
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <Pulse className="h-5 w-2/5" />
          <Pulse className="h-9 w-28 rounded-md" />
        </div>
        <RepeatedRows rows={rows} />
      </Panel>
    </>
  );
}

function ProfileSkeleton({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, sectionIndex) => (
        <Panel className="space-y-5" key={sectionIndex}>
          <div className="flex items-center gap-3 border-b border-line-subtle pb-4">
            <Pulse className="size-9 shrink-0 rounded-sm" />
            <div className="flex-1 space-y-2">
              <Pulse className="h-5 w-2/5" />
              <Pulse className="h-3 w-3/5" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, fieldIndex) => (
              <div className="space-y-2" key={fieldIndex}>
                <Pulse className="h-3 w-2/5" />
                <Pulse className="h-10 w-full rounded-md" />
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </>
  );
}

export function SkeletonLoader({
  label = "Loading content",
  rows = 4,
  showAction = false,
  variant = "cards",
}: SkeletonLoaderProps) {
  if (variant === "auth" || variant === "register") {
    return (
      <div
        aria-busy="true"
        aria-label={label}
        className="grid min-h-screen place-items-center bg-[#eaf8f1] px-4 py-6 sm:px-6 sm:py-10"
        role="status"
      >
        <span className="sr-only">{label}</span>
        <AuthSkeleton fields={variant === "register" ? 3 : 2} />
      </div>
    );
  }

  if (variant === "invite") {
    return (
      <div aria-busy="true" aria-label={label} role="status">
        <span className="sr-only">{label}</span>
        <InviteSkeleton />
      </div>
    );
  }

  return (
    <div aria-busy="true" aria-label={label} className="space-y-6" role="status">
      <span className="sr-only">{label}</span>
      <PageHeading showAction={showAction} />
      {variant === "dashboard" ? <DashboardSkeleton rows={rows} /> : null}
      {variant === "table" ? <TableSkeleton rows={rows} /> : null}
      {variant === "cards" ? <CardsSkeleton rows={rows} /> : null}
      {variant === "form" ? <FormSkeleton rows={rows} /> : null}
      {variant === "detail" ? <DetailSkeleton rows={rows} /> : null}
      {variant === "split-detail" ? <SplitDetailSkeleton /> : null}
      {variant === "documents" ? <DocumentsSkeleton rows={rows} /> : null}
      {variant === "queue" ? <QueueSkeleton rows={rows} /> : null}
      {variant === "schedule" ? <ScheduleSkeleton /> : null}
      {variant === "review" ? <ReviewSkeleton rows={rows} /> : null}
      {variant === "profile" ? <ProfileSkeleton rows={rows} /> : null}
    </div>
  );
}
