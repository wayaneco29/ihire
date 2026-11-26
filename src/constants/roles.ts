export const USER_ROLES = [
  "APPLICANT",
  "EVALUATOR",
  "DOCUMENT_REVIEWER",
  "HR",
  "SDS",
  "ASDS",
  "SUPER_ADMIN",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  APPLICANT: "Applicant",
  EVALUATOR: "Evaluator",
  DOCUMENT_REVIEWER: "Document reviewer",
  HR: "Human resources",
  SDS: "School Division Superintendent",
  ASDS: "Assistant School Division Superintendent",
  SUPER_ADMIN: "Super Administrator",
};
