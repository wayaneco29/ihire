import { StatusTag } from "./StatusTag";

const statusStyles: Record<string, string> = {
  DRAFT: "border-slate-200 bg-slate-50 text-slate-600",
  SUBMITTED: "border-blue-200 bg-blue-50 text-blue-700",
  UNDER_EVALUATION: "border-amber-200 bg-amber-50 text-amber-800",
  FOR_REVIEW: "border-amber-200 bg-amber-50 text-amber-800",
  PENDING: "border-slate-200 bg-slate-50 text-slate-600",
  FOR_RESUBMISSION: "border-orange-200 bg-orange-50 text-orange-800",
  VERIFIED: "border-primary/20 bg-primary-light text-primary",
  QUALIFIED: "border-primary/20 bg-primary-light text-primary",
  HIRED: "border-primary/20 bg-primary-light text-primary",
  OPEN: "border-primary/20 bg-primary-light text-primary",
  NOT_QUALIFIED: "border-red-200 bg-red-50 text-red-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  CLOSED: "border-slate-200 bg-slate-100 text-slate-600",
  UNAVAILABLE: "border-slate-200 bg-slate-50 text-slate-600",
};

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function WorkflowStatusTag({ status }: { status: string }) {
  return (
    <StatusTag className={statusStyles[status] ?? "border-slate-200 bg-slate-50 text-slate-600"}>
      {formatStatus(status)}
    </StatusTag>
  );
}
