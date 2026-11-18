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
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { formatDate } from "@/utils/format-date";
import type { Tables } from "@/types/database";

type PersonalInfo = Tables<"pds_personal_info">;
type Education = Tables<"pds_education">;
type WorkExperience = Tables<"pds_work_experience">;
type Training = Tables<"pds_learning_development">;
type OtherInfo = Tables<"pds_other_info">;

const PROFILE_SECTIONS = {
  personal: { id: "personal-information", title: "Personal information" },
  education: { id: "education", title: "Educational background" },
  experience: { id: "work-experience", title: "Work experience" },
  learning: { id: "learning-development", title: "Learning and development" },
  skills: { id: "skills-hobbies", title: "Skills and hobbies" },
} as const;

const PROFILE_SECTION_LINKS = Object.values(PROFILE_SECTIONS);

function InfoValue({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
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
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-24 border-b border-line-subtle py-6 first:pt-5 last:border-b-0 last:pb-5"
      id={id}
    >
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-md bg-primary-light text-primary [&>svg]:size-4"
        >
          {icon}
        </span>
        <h2
          className="font-[Bricolage_Grotesque] text-base font-semibold text-ink"
          id={`${id}-heading`}
        >
          {title}
        </h2>
        {count !== undefined && (
          <span className="rounded-full border border-line px-2 py-0.5 text-xs tabular-nums text-muted">
            {count}
          </span>
        )}
      </header>
      {children}
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
    <div className="mt-6 grid items-start gap-4 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-6">
      {hasDraft && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-warning/30 bg-warning/10 px-4 py-3 lg:col-span-2">
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

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <SurfaceCard className="p-2" tone="muted">
          <p className="px-3 py-2 text-xs font-semibold text-muted">
            On this page
          </p>
          <nav aria-label="Profile sections">
            <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
              {PROFILE_SECTION_LINKS.map((section) => (
                <li className="shrink-0" key={section.id}>
                  <a
                    className="block whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted hover:bg-panel hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    href={`#${section.id}`}
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </SurfaceCard>
      </aside>

      <div className="min-w-0">
        <SurfaceCard className="overflow-hidden px-4 sm:px-6">
          <ProfileSection
            icon={<UserIcon className="size-4" />}
            id={PROFILE_SECTIONS.personal.id}
            title={PROFILE_SECTIONS.personal.title}
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
            id={PROFILE_SECTIONS.education.id}
            title={PROFILE_SECTIONS.education.title}
            icon={<AcademicCapIcon className="size-4" />}
          >
            {education.length ? (
              <ul className="divide-y divide-line-subtle">
                {education.map((item) => (
                  <li className="py-4 first:pt-1 last:pb-0" key={item.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-ink">
                          {item.school_name || item.level.replaceAll("_", " ")}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {item.degree_course ||
                            item.highest_level_units_earned ||
                            "No course details provided"}
                        </p>
                      </div>
                      <span className="text-sm text-muted">
                        {item.period_from ?? "—"} –{" "}
                        {item.period_to ?? "Present"}
                      </span>
                    </div>
                    {item.honors_received && (
                      <p className="mt-2 text-sm text-muted">
                        Honors: {item.honors_received}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                className="[&_h2]:text-muted"
                icon={<InboxIcon className="size-4" />}
                title="No education records yet."
              />
            )}
          </ProfileSection>

          <ProfileSection
            count={experience.length}
            id={PROFILE_SECTIONS.experience.id}
            title={PROFILE_SECTIONS.experience.title}
            icon={<BriefcaseIcon className="size-4" />}
          >
            {experience.length ? (
              <ul className="mt-3 divide-y divide-line-subtle">
                {experience.map((item) => (
                  <li className="py-4 first:pt-1 last:pb-0" key={item.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-ink">
                          {item.position_title}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {item.agency_company}
                        </p>
                      </div>
                      <span className="text-sm text-muted">
                        {formatDate(item.date_from, "MMM YYYY")} –{" "}
                        {item.date_to
                          ? formatDate(item.date_to, "MMM YYYY")
                          : "Present"}
                      </span>
                    </div>
                    {item.duties_description && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">
                        {item.duties_description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                className="[&_h2]:text-muted"
                icon={<InboxIcon className="size-4" />}
                title="No work experience records yet."
              />
            )}
          </ProfileSection>

          <ProfileSection
            count={trainings.length}
            id={PROFILE_SECTIONS.learning.id}
            title={PROFILE_SECTIONS.learning.title}
            icon={<BookOpenIcon className="size-4" />}
          >
            {trainings.length ? (
              <ul className="mt-3 divide-y divide-line-subtle">
                {trainings.map((item) => (
                  <li
                    className="flex flex-wrap justify-between gap-2 py-3 first:pt-1 last:pb-0"
                    key={item.id}
                  >
                    <div>
                      <p className="font-medium text-ink">{item.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        {item.conducted_by || item.ld_type || "Training"}
                      </p>
                    </div>
                    <span className="text-sm text-muted">
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
                className="[&_h2]:text-muted"
                icon={<InboxIcon className="size-4" />}
                title="No learning and development records yet."
              />
            )}
          </ProfileSection>

          <ProfileSection
            count={skills.length}
            id={PROFILE_SECTIONS.skills.id}
            title={PROFILE_SECTIONS.skills.title}
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
        </SurfaceCard>
      </div>
    </div>
  );
}
