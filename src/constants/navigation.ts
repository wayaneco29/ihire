import {
  AppstoreOutlined,
  AuditOutlined,
  BellOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  MailOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { UserRole } from "./roles";

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof AppstoreOutlined;
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
      { label: "Overview", href: "/", icon: AppstoreOutlined, available: true },
      { label: "Sign in", href: "/login", icon: UserOutlined, available: true },
      {
        label: "Applicant registration",
        href: "/register",
        icon: FileTextOutlined,
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
        { label: "Overview", href: "/applicant", icon: AppstoreOutlined, available: true },
        { label: "Browse jobs", href: "/applicant/jobs", icon: SearchOutlined, available: true },
        {
          label: "My applications",
          href: "/applicant/applications",
          icon: FileTextOutlined,
          available: true,
        },
        {
          label: "Notifications",
          href: "/applicant/notifications",
          icon: BellOutlined,
          available: true,
        },
      ],
    },
    {
      title: "My profile",
      items: [
        { label: "Personal data sheet", href: "/applicant/pds", icon: UserOutlined, available: true },
        {
          label: "Profile",
          href: "/applicant/profile",
          icon: UserOutlined,
          available: true,
        },
        {
          label: "Documents",
          href: "/applicant/documents",
          icon: FolderOpenOutlined,
          available: true,
        },
      ],
    },
  ],
  EVALUATOR: [
    {
      title: "Reviews",
      items: [
        { label: "Review queue", href: "/evaluator/reviews", icon: AuditOutlined, available: true },
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
          icon: AppstoreOutlined,
          available: true,
        },
        {
          label: "Job postings",
          href: "/hr/postings",
          icon: SafetyCertificateOutlined,
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
          label: "Invitations",
          href: "/admin/invitations",
          icon: MailOutlined,
          available: true,
        },
      ],
    },
  ],
};

export function getNavigation(role: UserRole | null) {
  return role ? roleNavigation[role] : publicNavigation;
}
