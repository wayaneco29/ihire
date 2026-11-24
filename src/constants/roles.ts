export const USER_ROLES = [
  "APPLICANT",
  "EVALUATOR",
  "DOCUMENT_REVIEWER",
  "HR",
  "ADMIN",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  APPLICANT: "Applicant",
  EVALUATOR: "Evaluator",
  DOCUMENT_REVIEWER: "Document reviewer",
  HR: "Human resources",
  ADMIN: "Administrator",
};
