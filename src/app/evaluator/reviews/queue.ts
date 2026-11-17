export const REVIEW_QUEUE_PAGE_SIZE = 50;

export const REVIEW_QUEUE_STATUS_OPTIONS = [
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_EVALUATION", label: "Under evaluation" },
  { value: "ASSESSMENT_SCHEDULED", label: "Assessment scheduled" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "NOT_QUALIFIED", label: "Not qualified" },
] as const;

export type ReviewQueueStatus = (typeof REVIEW_QUEUE_STATUS_OPTIONS)[number]["value"];

export function reviewQueueStatus(value: string | undefined): ReviewQueueStatus | undefined {
  return REVIEW_QUEUE_STATUS_OPTIONS.find((option) => option.value === value)?.value;
}

export function reviewQueueHref(jobId: string, page = 1, status?: ReviewQueueStatus) {
  const params = new URLSearchParams({ jobId });
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  return `/evaluator/reviews?${params}`;
}
