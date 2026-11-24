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
  FILLED: {
    label: "Filled",
    className: "border-primary/20 bg-primary-light text-primary-dark",
  },
};

export function PostingStatusPill({
  status,
}: Readonly<{ status: PostingDisplayStatus }>) {
  const presentation = STATUS_PRESENTATION[status];

  return (
    <StatusTag
      className={presentation.className}
    >
      {presentation.label}
    </StatusTag>
  );
}
