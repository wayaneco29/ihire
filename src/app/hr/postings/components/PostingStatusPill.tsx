import { StatusTag } from "@/components/ui/StatusTag";
import type { PostingDisplayStatus } from "@/utils/job-posting-status";

const STATUS_PRESENTATION: Record<
  PostingDisplayStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "border-line bg-panel-muted text-muted-strong",
  },
  OPEN: {
    label: "Open",
    className: "border-success/20 bg-success/10 text-success",
  },
  CLOSED: {
    label: "Closed",
    className: "border-line bg-panel-muted text-muted-strong",
  },
  EXPIRED: {
    label: "Expired",
    className: "border-warning/20 bg-warning/10 text-warning",
  },
  FILLED: {
    label: "Filled",
    className: "border-primary/20 bg-primary-light text-primary-dark",
  },
};

export function PostingStatusPill({
  status,
  compact = false,
}: Readonly<{ status: PostingDisplayStatus; compact?: boolean }>) {
  const presentation = STATUS_PRESENTATION[status];

  return (
    <StatusTag
      className={`${presentation.className} ${compact ? "min-h-4! shrink-0 gap-1.5 rounded-full! border-transparent! px-2! py-0! text-[10px]!" : ""}`}
    >
      {compact && (
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-current opacity-70"
        />
      )}
      {presentation.label}
    </StatusTag>
  );
}
