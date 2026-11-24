import {
  BellIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  FolderOpenIcon,
  MagnifyingGlassIcon,
  AcademicCapIcon,
  AdjustmentsHorizontalIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  UserIcon,
} from "@heroicons/react/24/outline";
import type { UserRole } from "./roles";

type NavigationIcon = typeof Squares2X2Icon;

type NavigationItem = {
  label: string;
  href: string;
  icon: NavigationIcon;
  available: boolean;
};

export type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

const publicNavigation: NavigationSection[] = [
  {
    title: "Welcome",
    items: [
      { label: "Sign in", href: "/", icon: UserIcon, available: true },
      {
        label: "Applicant registration",
        href: "/register",
        icon: DocumentTextIcon,
        available: true,
      },
    ],
  },
];

const roleNavigation: Record<UserRole, NavigationSection[]> = {
  APPLICANT: [
    {
      title: "Workspace",
      items: [
        {
          label: "Dashboard",
          href: "/applicant/dashboard",
          icon: Squares2X2Icon,
          available: true,
        },
        {
          label: "Browse jobs",
          href: "/applicant/jobs",
          icon: MagnifyingGlassIcon,
          available: true,
        },
        {
          label: "My applications",
          href: "/applicant/applications",
          icon: DocumentTextIcon,
          available: true,
        },
        {
          label: "Notifications",
          href: "/applicant/notifications",
          icon: BellIcon,
          available: true,
        },
      ],
    },
    {
      title: "My profile",
      items: [
        {
          label: "Personal data sheet",
          href: "/applicant/pds",
          icon: ClipboardDocumentCheckIcon,
          available: true,
        },
        {
          label: "Documents",
          href: "/applicant/documents",
          icon: FolderOpenIcon,
          available: true,
        },
      ],
    },
  ],
  EVALUATOR: [
    {
      title: "Reviews",
      items: [
        {
          label: "Review queue",
          href: "/evaluator/reviews",
          icon: ClipboardDocumentCheckIcon,
          available: true,
        },
        {
          label: "Evaluation schedules",
          href: "/evaluator/evaluation-schedules",
          icon: AcademicCapIcon,
          available: true,
        },
      ],
    },
  ],
  DOCUMENT_REVIEWER: [
    {
      title: "Documents",
      items: [
        {
          label: "Review queue",
          href: "/document-reviewer/documents",
          icon: ClipboardDocumentCheckIcon,
          available: true,
        },
      ],
    },
  ],
  HR: [
    {
      title: "Hiring",
      items: [
        {
          label: "Dashboard",
          href: "/hr/dashboard",
          icon: Squares2X2Icon,
          available: true,
        },
        {
          label: "Job postings",
          href: "/hr/postings",
          icon: ShieldCheckIcon,
          available: true,
        },
        {
          label: "Positions and criteria",
          href: "/hr/criteria",
          icon: AdjustmentsHorizontalIcon,
          available: true,
        },
      ],
    },
  ],
  ADMIN: [
    {
      title: "Administration",
      items: [
        {
          label: "Evaluator assignments",
          href: "/admin/assignments",
          icon: ClipboardDocumentCheckIcon,
          available: true,
        },
        {
          label: "Invitations",
          href: "/admin/invitations",
          icon: EnvelopeIcon,
          available: true,
        },
      ],
    },
  ],
};

export function getNavigation(role: UserRole | null) {
  return role ? roleNavigation[role] : publicNavigation;
}
