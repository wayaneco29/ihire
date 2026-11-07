"use client";

import {
  AuditOutlined,
  FileProtectOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { StatusTag } from "./StatusTag";

const upcomingModules = [
  {
    title: "Applicant workspace",
    description: "PDS, profile, job search, and application tracking.",
    icon: FileProtectOutlined,
    phase: "Phases 3–5",
  },
  {
    title: "Evaluator reviews",
    description: "Anonymized document review and qualification decisions.",
    icon: AuditOutlined,
    phase: "Phase 6",
  },
  {
    title: "HR hiring tools",
    description: "Job postings, anonymized applicant lists, and hiring.",
    icon: SafetyCertificateOutlined,
    phase: "Phase 7",
  },
];

export function RoadmapCards() {
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      {upcomingModules.map(({ title, description, icon: Icon, phase }) => (
        <article
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]"
          key={title}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-primary-light text-lg text-primary">
              <Icon />
            </span>
            <StatusTag className="border-slate-200 bg-slate-50 text-slate-600">
              {phase}
            </StatusTag>
          </div>
          <h3 className="mt-5 text-base font-semibold text-ink">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </article>
      ))}
    </div>
  );
}
