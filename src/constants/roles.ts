export const USER_ROLES = ["APPLICANT", "EVALUATOR", "HR", "ADMIN"] as const;

export type UserRole = (typeof USER_ROLES)[number];
