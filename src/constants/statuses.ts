export const DOCUMENT_STATUSES = [
  "PENDING",
  "FOR_REVIEW",
  "VERIFIED",
  "REJECTED",
  "FOR_RESUBMISSION",
] as const;

export const APPLICATION_STATUSES = [
  "SUBMITTED",
  "UNDER_EVALUATION",
  "QUALIFIED",
  "NOT_QUALIFIED",
  "HIRED",
  "REJECTED",
] as const;

export const PDS_STATUSES = ["DRAFT", "SUBMITTED"] as const;
