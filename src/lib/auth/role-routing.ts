import { USER_ROLES, type UserRole } from "@/constants/roles";

export const ROLE_HOME: Record<UserRole, string> = {
  APPLICANT: "/applicant",
  EVALUATOR: "/evaluator/reviews",
  DOCUMENT_REVIEWER: "/document-reviewer/documents",
  HR: "/hr/dashboard",
  SDS: "/sds/applications",
  ASDS: "/asds/applications",
  SUPER_ADMIN: "/admin/invitations",
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}
