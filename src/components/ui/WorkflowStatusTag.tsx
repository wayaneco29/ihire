import { StatusTag } from "./StatusTag";

const statusStyles: Record<string, string> = {
  DRAFT: "border-line bg-panel-muted text-muted",
  SUBMITTED: "border-info/20 bg-info/10 text-info",
  UNDER_EVALUATION: "border-warning/30 bg-warning/10 text-warning",
  ASSESSMENT_SCHEDULED: "border-warning/30 bg-warning/10 text-warning",
  ASSESSMENT_SCORED: "border-info/20 bg-info/10 text-info",
  FOR_REVIEW: "border-warning/30 bg-warning/10 text-warning",
  PENDING: "border-line bg-panel-muted text-muted",
  FOR_RESUBMISSION: "border-danger/30! bg-danger/10 text-danger",
  VERIFIED: "border-primary/20 bg-primary-light text-primary",
  APPROVED: "border-primary/20 bg-primary-light text-primary",
  QUALIFIED: "border-primary/20 bg-primary-light text-primary",
  HIRED: "border-primary/20 bg-primary-light text-primary",
  NOT_SELECTED: "border-line bg-panel-muted text-muted",
  OPEN: "border-primary/20 bg-primary-light text-primary",
  NOT_QUALIFIED: "border-danger/20 bg-danger/10 text-danger",
  REJECTED: "border-danger/20 bg-danger/10 text-danger",
  CLOSED: "border-line bg-panel-muted text-muted",
  UNAVAILABLE: "border-line bg-panel-muted text-muted",
};

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function WorkflowStatusTag({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  return (
    <StatusTag
      className={`min-w-0 justify-center text-center ${statusStyles[status] ?? "border-line bg-panel-muted text-muted"}`}
    >
      {label ?? formatStatus(status)}
    </StatusTag>
  );
}
