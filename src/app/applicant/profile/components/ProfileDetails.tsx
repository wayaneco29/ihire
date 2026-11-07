import type { ReactNode } from "react";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { formatDate } from "@/utils/format-date";
import type { Tables } from "@/types/database";

type PersonalInfo = Tables<"pds_personal_info">;
type Education = Tables<"pds_education">;
type WorkExperience = Tables<"pds_work_experience">;
type Training = Tables<"pds_learning_development">;
type OtherInfo = Tables<"pds_other_info">;

function InfoValue({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-ink">{value || "—"}</dd>
    </div>
  );
}

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="font-semibold text-ink">{title}</h2>
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
  const fullName = personal
    ? [personal.first_name, personal.middle_name, personal.surname, personal.name_extension]
        .filter(Boolean)
        .join(" ")
    : "Applicant profile";

  return (
    <div className="mt-7 space-y-5">
      {hasDraft && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div>
            <p className="text-sm font-semibold text-amber-900">PDS update in progress</p>
            <p className="mt-1 text-sm text-amber-800">
              Your submitted version {versionNumber} remains active until you submit the update.
            </p>
          </div>
          <WorkflowStatusTag status="DRAFT" />
        </div>
      )}

      <ProfileSection title="Personal information">
        <p className="mt-3 text-lg font-semibold text-ink">{fullName}</p>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoValue label="Date of birth" value={formatDate(personal?.date_of_birth)} />
          <InfoValue label="Place of birth" value={personal?.place_of_birth} />
          <InfoValue label="Sex at birth" value={personal?.sex_at_birth} />
          <InfoValue label="Civil status" value={personal?.civil_status_other ?? personal?.civil_status} />
          <InfoValue label="Citizenship" value={personal?.dual_citizenship_country ? `${personal.citizenship} · ${personal.dual_citizenship_country}` : personal?.citizenship} />
          <InfoValue label="Email" value={personal?.email} />
          <InfoValue label="Mobile number" value={personal?.mobile_no} />
          <InfoValue label="Telephone number" value={personal?.telephone_no} />
        </dl>
      </ProfileSection>

      <ProfileSection title="Educational background">
        {education.length ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {education.map((item) => (
              <li className="py-4 first:pt-0 last:pb-0" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">{item.school_name || item.level.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-sm text-muted">{item.degree_course || item.highest_level_units_earned || "No course details provided"}</p>
                  </div>
                  <span className="text-sm text-muted">
                    {item.period_from ?? "—"} – {item.period_to ?? "Present"}
                  </span>
                </div>
                {item.honors_received && <p className="mt-2 text-sm text-muted">Honors: {item.honors_received}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-muted">No education records available.</p>}
      </ProfileSection>

      <ProfileSection title="Work experience">
        {experience.length ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {experience.map((item) => (
              <li className="py-4 first:pt-0 last:pb-0" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">{item.position_title}</p>
                    <p className="mt-1 text-sm text-muted">{item.agency_company}</p>
                  </div>
                  <span className="text-sm text-muted">
                    {formatDate(item.date_from, "MMM YYYY")} – {item.date_to ? formatDate(item.date_to, "MMM YYYY") : "Present"}
                  </span>
                </div>
                {item.duties_description && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">{item.duties_description}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-muted">No work experience records available.</p>}
      </ProfileSection>

      <ProfileSection title="Learning and development">
        {trainings.length ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {trainings.map((item) => (
              <li className="flex flex-wrap justify-between gap-2 py-3 first:pt-0 last:pb-0" key={item.id}>
                <div>
                  <p className="font-medium text-ink">{item.title}</p>
                  <p className="mt-1 text-sm text-muted">{item.conducted_by || item.ld_type || "Training"}</p>
                </div>
                <span className="text-sm text-muted">
                  {formatDate(item.date_from)}{item.date_to ? ` – ${formatDate(item.date_to)}` : ""}
                  {item.hours !== null ? ` · ${item.hours} hours` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-muted">No learning and development records available.</p>}
      </ProfileSection>

      <ProfileSection title="Skills and hobbies">
        {skills.length ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {skills.map((item) => (
              <li className="rounded-full bg-primary-light px-3 py-1.5 text-sm text-primary" key={item.id}>{item.description}</li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-muted">No skills or hobbies listed.</p>}
      </ProfileSection>
    </div>
  );
}
