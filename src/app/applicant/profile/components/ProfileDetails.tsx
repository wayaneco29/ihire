"use client";

import type { ReactNode } from "react";
import {
  AcademicCapIcon,
  BookOpenIcon,
  BriefcaseIcon,
  InboxIcon,
  SparklesIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/utils/format-date";
import type { Tables } from "@/types/database";

type PersonalInfo = Tables<"pds_personal_info">;
type Education = Tables<"pds_education">;
type WorkExperience = Tables<"pds_work_experience">;
type Training = Tables<"pds_learning_development">;
type OtherInfo = Tables<"pds_other_info">;

function InfoValue({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-profile-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-ink">{value || "—"}</dd>
    </div>
  );
}

function ProfileSection({
  id,
  title,
  count,
  icon,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="scroll-mt-5 overflow-hidden rounded-sm! border border-profile-line bg-profile-panel shadow-card"
      id={id}
    >
      <h2>
        <span className="flex min-h-[3.25rem] w-full items-center justify-between gap-3 border-b border-profile-line px-4 py-3 text-left sm:px-4">
          <span className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-sm bg-primary-light text-sm text-primary"
            >
              <span className="[&>svg]:size-4">{icon}</span>
            </span>
            <span className="truncate text-sm font-semibold text-ink">
              {title}
            </span>
            {count !== undefined && (
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-panel-muted text-[11px] font-medium tabular-nums text-profile-muted">
                {count}
              </span>
            )}
          </span>
        </span>
      </h2>
      <div className="px-4 py-4 sm:px-4">{children}</div>
    </section>
  );
}

export function ProfileDetails({
  personal,
  education,
  experience,
  trainings,
  skills,
  versionNumber,
  hasDraft,
}: {
  personal: PersonalInfo | null;
  education: Education[];
  experience: WorkExperience[];
  trainings: Training[];
  skills: OtherInfo[];
  versionNumber: number;
  hasDraft: boolean;
}) {
  return (
    <div className="mt-5 grid items-start gap-4">
      {hasDraft && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-warning/30 bg-warning/10 px-4 py-3 md:col-span-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-warning">
              PDS update in progress
            </p>
            <p className="mt-1 text-sm text-warning">
              Your submitted version {versionNumber} remains active until you
              submit the update.
            </p>
          </div>
          <WorkflowStatusTag status="DRAFT" />
        </div>
      )}

      <div className="min-w-0">
        <div className="mt-2 space-y-3">
          <ProfileSection
            icon={<UserIcon className="size-4" />}
            id="personal-information"
            title="Personal information"
          >
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              <InfoValue
                label="Date of birth"
                value={formatDate(personal?.date_of_birth)}
              />
              <InfoValue
                label="Place of birth"
                value={personal?.place_of_birth}
              />
              <InfoValue label="Sex at birth" value={personal?.sex_at_birth} />
              <InfoValue
                label="Civil status"
                value={personal?.civil_status_other ?? personal?.civil_status}
              />
              <InfoValue
                label="Citizenship"
                value={
                  personal?.dual_citizenship_country
                    ? `${personal.citizenship} · ${personal.dual_citizenship_country}`
                    : personal?.citizenship
                }
              />
              <InfoValue label="Email" value={personal?.email} />
              <InfoValue label="Mobile number" value={personal?.mobile_no} />
              <InfoValue
                label="Telephone number"
                value={personal?.telephone_no}
              />
            </dl>
          </ProfileSection>

          <ProfileSection
            count={education.length}
            id="education"
            title="Educational background"
            icon={<AcademicCapIcon className="size-4" />}
          >
            {education.length ? (
              <ul className="divide-y divide-profile-line">
                {education.map((item) => (
                  <li className="py-4 first:pt-1 last:pb-0" key={item.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-ink">
                          {item.school_name || item.level.replaceAll("_", " ")}
                        </p>
                        <p className="mt-1 text-sm text-profile-muted">
                          {item.degree_course ||
                            item.highest_level_units_earned ||
                            "No course details provided"}
                        </p>
                      </div>
                      <span className="text-sm text-profile-muted">
                        {item.period_from ?? "—"} –{" "}
                        {item.period_to ?? "Present"}
                      </span>
                    </div>
                    {item.honors_received && (
                      <p className="mt-2 text-sm text-profile-muted">
                        Honors: {item.honors_received}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={<InboxIcon className="size-4" />}
                title="No education records yet."
              />
            )}
          </ProfileSection>

          <ProfileSection
            count={experience.length}
            id="work-experience"
            title="Work experience"
            icon={<BriefcaseIcon className="size-4" />}
          >
            {experience.length ? (
              <ul className="mt-3 divide-y divide-profile-line">
                {experience.map((item) => (
                  <li className="py-4 first:pt-1 last:pb-0" key={item.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-ink">
                          {item.position_title}
                        </p>
                        <p className="mt-1 text-sm text-profile-muted">
                          {item.agency_company}
                        </p>
                      </div>
                      <span className="text-sm text-profile-muted">
                        {formatDate(item.date_from, "MMM YYYY")} –{" "}
                        {item.date_to
                          ? formatDate(item.date_to, "MMM YYYY")
                          : "Present"}
                      </span>
                    </div>
                    {item.duties_description && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-profile-muted">
                        {item.duties_description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={<InboxIcon className="size-4" />}
                title="No work experience records yet."
              />
            )}
          </ProfileSection>

          <ProfileSection
            count={trainings.length}
            id="learning-development"
            title="Learning and development"
            icon={<BookOpenIcon className="size-4" />}
          >
            {trainings.length ? (
              <ul className="mt-3 divide-y divide-profile-line">
                {trainings.map((item) => (
                  <li
                    className="flex flex-wrap justify-between gap-2 py-3 first:pt-1 last:pb-0"
                    key={item.id}
                  >
                    <div>
                      <p className="font-medium text-ink">{item.title}</p>
                      <p className="mt-1 text-sm text-profile-muted">
                        {item.conducted_by || item.ld_type || "Training"}
                      </p>
                    </div>
                    <span className="text-sm text-profile-muted">
                      {formatDate(item.date_from)}
                      {item.date_to ? ` – ${formatDate(item.date_to)}` : ""}
                      {item.hours !== null ? ` · ${item.hours} hours` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={<InboxIcon className="size-4" />}
                title="No learning and development records yet."
              />
            )}
          </ProfileSection>

          <ProfileSection
            count={skills.length}
            id="skills-hobbies"
            title="Skills and hobbies"
            icon={<SparklesIcon className="size-4" />}
          >
            {skills.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {skills.map((item) => (
                  <li
                    className="rounded-sm bg-primary-light px-3 py-1.5 text-sm text-primary"
                    key={item.id}
                  >
                    {item.description}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={<InboxIcon className="size-4" />}
                title="No skills or hobbies listed yet."
              />
            )}
          </ProfileSection>
        </div>
      </div>
    </div>
  );
}
