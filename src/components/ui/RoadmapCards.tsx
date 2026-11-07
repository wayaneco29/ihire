"use client";

import {
  AuditOutlined,
  FileProtectOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { StatusTag } from "./StatusTag";
import { SurfaceCard } from "./SurfaceCard";

const workspaces = [
  {
    title: "Applicant workspace",
    description: "Keep your PDS, job search, applications, and documents together.",
    icon: FileProtectOutlined,
            role: "Applicant",
  },
  {
    title: "Evaluator workspace",
    description: "Review applications and supporting documents with identity protections.",
    icon: AuditOutlined,
    role: "Evaluator",
  },
  {
    title: "HR workspace",
    description: "Manage postings, review candidates, and record hiring decisions.",
    icon: SafetyCertificateOutlined,
    role: "HR",
  },
];

export function RoadmapCards() {
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      {workspaces.map(({ title, description, icon: Icon, role }) => (
        <SurfaceCard as="article" className="p-5" key={title} tone="interactive">
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-primary-light text-lg text-primary">
              <Icon />
            </span>
            <StatusTag className="border-line bg-panel-muted text-muted">
              {role}
            </StatusTag>
          </div>
          <h3 className="mt-5 text-base font-semibold text-ink">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </SurfaceCard>
      ))}
    </div>
  );
}
