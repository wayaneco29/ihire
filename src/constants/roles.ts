export const USER_ROLES = [
  "APPLICANT",
  "EVALUATOR",
  "DOCUMENT_REVIEWER",
  "HR",
  "ADMIN",
] as const;

export type UserRole = (typeof USER_ROLES)[number];
