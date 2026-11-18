import type { ReactNode } from "react";
import {
  AcademicCapIcon,
  BookOpenIcon,
  BriefcaseIcon,
  CheckBadgeIcon,
  HandRaisedIcon,
  IdentificationIcon,
  InboxIcon,
  SparklesIcon,
  UserGroupIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import {
  CIVIL_STATUS_OPTIONS,
  COUNTRY_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  OTHER_INFO_CATEGORY_OPTIONS,
} from "@/constants/pds-options";
import { WorkflowStatusTag } from "@/components/ui/WorkflowStatusTag";
import { EmptyState } from "@/components/ui/EmptyState";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { formatDate } from "@/utils/format-date";
import {
  formatPdsAddress,
  formatPdsCode,
  formatPdsDateRange,
  formatPdsOption,
  formatPdsPersonName,
  formatPdsSalary,
} from "@/utils/format-pds-profile";
import type { Tables } from "@/types/database";

type PersonalInfo = Tables<"pds_personal_info">;
type Address = Tables<"pds_addresses">;
type FamilyBackground = Tables<"pds_family_background">;
type Child = Tables<"pds_children">;
type Education = Tables<"pds_education">;
type Eligibility = Tables<"pds_eligibility">;
type WorkExperience = Tables<"pds_work_experience">;
type VoluntaryWork = Tables<"pds_voluntary_work">;
type Training = Tables<"pds_learning_development">;
type OtherInfo = Tables<"pds_other_info">;
type Reference = Tables<"pds_references">;

const PROFILE_SECTIONS = {
  personal: { id: "personal-information", title: "Personal information" },
  family: { id: "family-background", title: "Family background" },
  education: { id: "education", title: "Educational background" },
  eligibility: { id: "eligibility", title: "Civil service eligibility" },
  experience: { id: "work-experience", title: "Work experience" },
  voluntary: { id: "voluntary-work", title: "Voluntary work" },
  learning: { id: "learning-development", title: "Learning and development" },
  other: { id: "other-information", title: "Other information" },
  references: { id: "references", title: "References" },
} as const;

const PROFILE_SECTION_LINKS = Object.values(PROFILE_SECTIONS);

function InfoValue({ label, value }: { label: string; value: ReactNode }) {
  const isEmpty = value === null || value === undefined || value === "";

  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 wrap-break-words text-sm font-medium text-ink">
        {isEmpty ? "—" : value}
      </dd>
    </div>
  );
}

function InfoGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-ink">{title}</h3>
      {children}
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
      aria-labelledby={id + "-heading"}
      className="scroll-mt-24 border-b border-line-subtle py-5 last:border-b-0"
      id={id}
    >
      <header className="mb-3 flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-sm bg-primary-light text-primary"
        >
          {icon}
        </span>
        <h2
          className="font-[Bricolage_Grotesque] text-sm font-semibold text-primary-dark"
          id={id + "-heading"}
        >
          {title}
        </h2>
        {count !== undefined && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs tabular-nums text-white">
            {count}
          </span>
        )}
      </header>
      <div className="rounded-sm bg-primary/5 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function EmptyRecords({ title }: { title: string }) {
  return (
    <EmptyState
      compact
      className="[&_h2]:text-muted"
      icon={<InboxIcon className="size-5" />}
      iconClassName="mb-0!"
      title={title}
    />
  );
}

export function ProfileDetails({
  personal,
  addresses,
  family,
  childrenRecords,
  education,
  eligibility,
  experience,
  voluntaryWork,
  trainings,
  otherInfo,
  references,
  versionNumber,
  hasDraft,
}: {
  personal: PersonalInfo | null;
  addresses: Address[];
  family: FamilyBackground | null;
  childrenRecords: Child[];
  education: Education[];
  eligibility: Eligibility[];
  experience: WorkExperience[];
  voluntaryWork: VoluntaryWork[];
  trainings: Training[];
  otherInfo: OtherInfo[];
  references: Reference[];
  versionNumber: number;
  hasDraft: boolean;
}) {
  const residentialAddress = addresses.find(
    (address) => address.type === "RESIDENTIAL",
  );
  const permanentAddress = addresses.find(
    (address) => address.type === "PERMANENT",
  );
  return (
    <div className="mt-6">
      {hasDraft && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-warning/30 bg-warning/10 px-4 py-3">
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

      <SurfaceCard className="mt-2 overflow-hidden px-4 sm:px-6">
        <ProfileSection
          icon={<UserIcon aria-hidden="true" className="size-4" />}
          id={PROFILE_SECTIONS.personal.id}
          title={PROFILE_SECTIONS.personal.title}
        >
          <div className="space-y-6">
            <InfoGroup title="Name and personal details">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                <InfoValue
                  label="Full name"
                  value={formatPdsPersonName({
                    first_name: personal?.first_name,
                    middle_name: personal?.middle_name,
                    surname: personal?.surname,
                    name_extension: personal?.name_extension,
                  })}
                />
                <InfoValue
                  label="Date of birth"
                  value={formatDate(personal?.date_of_birth, "MMMM D, YYYY")}
                />
                <InfoValue
                  label="Place of birth"
                  value={personal?.place_of_birth}
                />
                <InfoValue
                  label="Sex at birth"
                  value={formatPdsCode(personal?.sex_at_birth)}
                />
                <InfoValue
                  label="Civil status"
                  value={
                    personal?.civil_status === "OTHER"
                      ? personal.civil_status_other || "Other"
                      : formatPdsOption(
                          personal?.civil_status,
                          CIVIL_STATUS_OPTIONS,
                        )
                  }
                />
                <InfoValue
                  label="Height"
                  value={
                    personal?.height_m == null ? null : personal.height_m + " m"
                  }
                />
                <InfoValue
                  label="Weight"
                  value={
                    personal?.weight_kg == null
                      ? null
                      : personal.weight_kg + " kg"
                  }
                />
                <InfoValue label="Blood type" value={personal?.blood_type} />
              </dl>
            </InfoGroup>

            <InfoGroup title="Citizenship and identification">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                <InfoValue
                  label="Citizenship"
                  value={
                    personal?.citizenship === "DUAL"
                      ? "Dual citizenship"
                      : formatPdsCode(personal?.citizenship)
                  }
                />
                {personal?.citizenship === "DUAL" && (
                  <>
                    <InfoValue
                      label="Dual citizenship acquired by"
                      value={formatPdsCode(personal.dual_citizenship_by)}
                    />
                    <InfoValue
                      label="Other country"
                      value={formatPdsOption(
                        personal.dual_citizenship_country,
                        COUNTRY_OPTIONS,
                      )}
                    />
                  </>
                )}
                <InfoValue label="UMID No." value={personal?.umid_no} />
                <InfoValue label="Pag-IBIG No." value={personal?.pagibig_no} />
                <InfoValue
                  label="PhilHealth No."
                  value={personal?.philhealth_no}
                />
                <InfoValue label="PhilSys No." value={personal?.philsys_no} />
                <InfoValue label="TIN" value={personal?.tin_no} />
                <InfoValue
                  label="Agency employee No."
                  value={personal?.agency_employee_no}
                />
              </dl>
            </InfoGroup>

            <InfoGroup title="Contact details">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                <InfoValue label="Email address" value={personal?.email} />
                <InfoValue label="Mobile No." value={personal?.mobile_no} />
                <InfoValue
                  label="Telephone No."
                  value={personal?.telephone_no}
                />
              </dl>
            </InfoGroup>

            <InfoGroup title="Addresses">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <InfoValue
                  label="Residential address"
                  value={formatPdsAddress(residentialAddress)}
                />
                <InfoValue
                  label="Permanent address"
                  value={
                    permanentAddress?.same_as_residential
                      ? "Same as residential address"
                      : formatPdsAddress(permanentAddress)
                  }
                />
              </dl>
            </InfoGroup>
          </div>
        </ProfileSection>

        <ProfileSection
          icon={<UserGroupIcon aria-hidden="true" className="size-4" />}
          id={PROFILE_SECTIONS.family.id}
          title={PROFILE_SECTIONS.family.title}
        >
          <div className="space-y-6">
            <InfoGroup title="Spouse">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                <InfoValue
                  label="Full name"
                  value={formatPdsPersonName({
                    first_name: family?.spouse_first_name,
                    middle_name: family?.spouse_middle_name,
                    surname: family?.spouse_surname,
                    name_extension: family?.spouse_name_extension,
                  })}
                />
                <InfoValue
                  label="Occupation"
                  value={family?.spouse_occupation}
                />
                <InfoValue
                  label="Employer / business name"
                  value={family?.spouse_employer}
                />
                <InfoValue
                  label="Business address"
                  value={family?.spouse_business_address}
                />
                <InfoValue
                  label="Telephone No."
                  value={family?.spouse_telephone_no}
                />
              </dl>
            </InfoGroup>

            <InfoGroup title="Father">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <InfoValue
                  label="Full name"
                  value={formatPdsPersonName({
                    first_name: family?.father_first_name,
                    middle_name: family?.father_middle_name,
                    surname: family?.father_surname,
                    name_extension: family?.father_name_extension,
                  })}
                />
              </dl>
            </InfoGroup>

            <InfoGroup title="Mother's maiden name">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <InfoValue
                  label="Full name"
                  value={formatPdsPersonName({
                    first_name: family?.mother_first_name,
                    middle_name: family?.mother_middle_name,
                    surname: family?.mother_surname,
                  })}
                />
              </dl>
            </InfoGroup>

            <InfoGroup title="Children">
              {childrenRecords.length ? (
                <ul className="divide-y divide-line-subtle">
                  {childrenRecords.map((child) => (
                    <li className="py-3 first:pt-0 last:pb-0" key={child.id}>
                      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                        <InfoValue label="Full name" value={child.full_name} />
                        <InfoValue
                          label="Date of birth"
                          value={formatDate(
                            child.date_of_birth,
                            "MMMM D, YYYY",
                          )}
                        />
                      </dl>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyRecords title="No children listed." />
              )}
            </InfoGroup>
          </div>
        </ProfileSection>

        <ProfileSection
          count={education.length}
          icon={<AcademicCapIcon aria-hidden="true" className="size-4" />}
          id={PROFILE_SECTIONS.education.id}
          title={PROFILE_SECTIONS.education.title}
        >
          {education.length ? (
            <ul className="divide-y divide-line-subtle">
              {education.map((item) => (
                <li className="py-4 first:pt-0 last:pb-0" key={item.id}>
                  <h3 className="font-medium text-sm text-ink">
                    {formatPdsOption(item.level, EDUCATION_LEVEL_OPTIONS)}
                  </h3>
                  {item.school_name && (
                    <p className="mt-1 text-sm text-muted">
                      {item.school_name}
                    </p>
                  )}
                  <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                    <InfoValue
                      label="Degree or course"
                      value={item.degree_course}
                    />
                    <InfoValue
                      label="Period attended"
                      value={
                        item.period_from == null && item.period_to == null
                          ? null
                          : (item.period_from ?? "—") +
                            " – " +
                            (item.period_to ?? "—")
                      }
                    />
                    <InfoValue
                      label="Year graduated"
                      value={item.year_graduated}
                    />
                    <InfoValue
                      label="Scholarship or honors"
                      value={item.honors_received}
                    />
                    {item.level === "GRADUATE_STUDIES" ? (
                      <>
                        <InfoValue
                          label="Graduate degree type"
                          value={
                            item.graduate_degree_type === "MASTERS"
                              ? "Master's"
                              : item.graduate_degree_type === "DOCTORATE"
                                ? "Doctorate"
                                : null
                          }
                        />
                        <InfoValue
                          label="Graduate degree completed"
                          value={
                            item.graduate_degree_completed == null
                              ? null
                              : item.graduate_degree_completed
                                ? "Yes"
                                : "No"
                          }
                        />
                        <InfoValue
                          label="Graduate units earned"
                          value={item.graduate_units_earned}
                        />
                      </>
                    ) : (
                      <InfoValue
                        label="Highest level or units earned"
                        value={item.highest_level_units_earned}
                      />
                    )}
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyRecords title="No education records yet." />
          )}
        </ProfileSection>

        <ProfileSection
          count={eligibility.length}
          icon={<CheckBadgeIcon aria-hidden="true" className="size-4" />}
          id={PROFILE_SECTIONS.eligibility.id}
          title={PROFILE_SECTIONS.eligibility.title}
        >
          {eligibility.length ? (
            <ul className="divide-y divide-line-subtle">
              {eligibility.map((item) => (
                <li className="py-4 first:pt-0 last:pb-0" key={item.id}>
                  <h3 className="font-medium text-sm text-ink">
                    {item.eligibility_name}
                  </h3>
                  <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                    <InfoValue label="Rating" value={item.rating} />
                    <InfoValue
                      label="Date of examination"
                      value={formatDate(item.exam_date, "MMMM D, YYYY")}
                    />
                    <InfoValue
                      label="Place of examination"
                      value={item.exam_place}
                    />
                    <InfoValue label="License No." value={item.license_no} />
                    <InfoValue
                      label="License validity date"
                      value={formatDate(
                        item.license_valid_until,
                        "MMMM D, YYYY",
                      )}
                    />
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyRecords title="No civil service eligibility records yet." />
          )}
        </ProfileSection>

        <ProfileSection
          count={experience.length}
          icon={<BriefcaseIcon aria-hidden="true" className="size-4" />}
          id={PROFILE_SECTIONS.experience.id}
          title={PROFILE_SECTIONS.experience.title}
        >
          {experience.length ? (
            <ul className="divide-y divide-line-subtle">
              {experience.map((item) => (
                <li className="py-4 first:pt-0 last:pb-0" key={item.id}>
                  <h3 className="font-medium text-sm text-ink">
                    {item.position_title}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {item.agency_company}
                  </p>
                  <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                    <InfoValue
                      label="Period"
                      value={
                        formatDate(item.date_from, "MMM YYYY") +
                        " – " +
                        (item.date_to
                          ? formatDate(item.date_to, "MMM YYYY")
                          : "Present")
                      }
                    />
                    <InfoValue
                      label="Government service"
                      value={item.is_gov_service ? "Yes" : "No"}
                    />
                    <InfoValue
                      label="Appointment status"
                      value={item.appointment_status}
                    />
                    <InfoValue
                      label="Monthly salary"
                      value={formatPdsSalary(item.monthly_salary)}
                    />
                    <InfoValue
                      label="Salary grade / step"
                      value={item.salary_grade_step}
                    />
                  </dl>
                  {item.duties_description && (
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted">
                      {item.duties_description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyRecords title="No work experience records yet." />
          )}
        </ProfileSection>

        <ProfileSection
          count={voluntaryWork.length}
          icon={<HandRaisedIcon aria-hidden="true" className="size-4" />}
          id={PROFILE_SECTIONS.voluntary.id}
          title={PROFILE_SECTIONS.voluntary.title}
        >
          {voluntaryWork.length ? (
            <ul className="divide-y divide-line-subtle">
              {voluntaryWork.map((item) => (
                <li className="py-4 first:pt-0 last:pb-0" key={item.id}>
                  <h3 className="font-medium text-sm text-ink">
                    {item.organization_name_address}
                  </h3>
                  <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                    <InfoValue
                      label="Period"
                      value={formatPdsDateRange(item.date_from, item.date_to)}
                    />
                    <InfoValue label="Number of hours" value={item.hours} />
                    <InfoValue
                      label="Position / nature of work"
                      value={item.position_nature}
                    />
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyRecords title="No voluntary work records yet." />
          )}
        </ProfileSection>

        <ProfileSection
          count={trainings.length}
          icon={<BookOpenIcon aria-hidden="true" className="size-4" />}
          id={PROFILE_SECTIONS.learning.id}
          title={PROFILE_SECTIONS.learning.title}
        >
          {trainings.length ? (
            <ul className="divide-y divide-line-subtle">
              {trainings.map((item) => (
                <li className="py-4 first:pt-0 last:pb-0" key={item.id}>
                  <h3 className="font-medium text-sm text-ink">{item.title}</h3>
                  <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                    <InfoValue label="Conducted by" value={item.conducted_by} />
                    <InfoValue
                      label="Learning and development type"
                      value={item.ld_type}
                    />
                    <InfoValue
                      label="Period"
                      value={formatPdsDateRange(item.date_from, item.date_to)}
                    />
                    <InfoValue label="Number of hours" value={item.hours} />
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyRecords title="No learning and development records yet." />
          )}
        </ProfileSection>

        <ProfileSection
          count={otherInfo.length}
          icon={<SparklesIcon aria-hidden="true" className="size-4" />}
          id={PROFILE_SECTIONS.other.id}
          title={PROFILE_SECTIONS.other.title}
        >
          {otherInfo.length ? (
            <ul className="divide-y divide-line-subtle">
              {otherInfo.map((item) => (
                <li className="py-4 first:pt-0 last:pb-0" key={item.id}>
                  <h3 className="font-medium text-sm text-primary-dark">
                    {formatPdsOption(
                      item.category,
                      OTHER_INFO_CATEGORY_OPTIONS,
                    )}
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyRecords title="No other information added yet." />
          )}
        </ProfileSection>

        <ProfileSection
          count={references.length}
          icon={<IdentificationIcon aria-hidden="true" className="size-4" />}
          id={PROFILE_SECTIONS.references.id}
          title={PROFILE_SECTIONS.references.title}
        >
          {references.length ? (
            <ul className="divide-y divide-line-subtle">
              {references.map((reference, index) => (
                <li className="py-4 first:pt-0 last:pb-0" key={reference.id}>
                  <h3 className="mb-3 text-sm font-semibold text-primary-dark">
                    Reference {index + 1}
                  </h3>
                  <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <InfoValue label="Full name" value={reference.name} />
                    <InfoValue
                      label="Contact No. and/or email"
                      value={reference.contact}
                    />
                    <InfoValue
                      label="Office / residential address"
                      value={reference.address}
                    />
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyRecords title="No references listed yet." />
          )}
        </ProfileSection>
      </SurfaceCard>
    </div>
  );
}
