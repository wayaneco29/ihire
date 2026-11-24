import type { Json } from "@/types/database";
import { COUNTRY_OPTIONS } from "@/constants/pds-options";
import { PDS_QUESTIONNAIRE_ITEMS } from "@/constants/pds-questionnaire";
import { formatDate } from "@/utils/format-date";

const FIELD_LABELS: Record<string, string> = {
  date_of_birth: "Date of birth",
  date_from: "From",
  date_to: "To",
  date_filed: "Date filed",
  sameAsResidential: "Same as residential address",
  is_gov_service: "Government service",
  ld_type: "Type",
  id_no: "ID number",
  sort_order: "Order",
  first_name: "First name",
  middle_name: "Middle name",
  full_name: "Full name",
  name_extension: "Name extension",
  surname: "Surname",
  civil_status_other: "Other civil status",
  sex_at_birth: "Sex at birth",
  height_m: "Height (m)",
  weight_kg: "Weight (kg)",
  mobile_no: "Mobile number",
  telephone_no: "Telephone number",
  pagibig_no: "Pag-IBIG number",
  philhealth_no: "PhilHealth number",
  philsys_no: "PhilSys number",
  umid_no: "UMID number",
  tin_no: "TIN",
  agency_employee_no: "Agency employee number",
  house_block_lot_no: "House / block / lot",
  subdivision_village: "Subdivision / village",
  city_municipality: "City / municipality",
  zip_code: "ZIP code",
  school_name: "Name of school",
  degree_course: "Degree or course",
  period_from: "Period from",
  period_to: "Period to",
  year_graduated: "Year graduated",
  highest_level_units_earned: "Highest level or units earned",
  honors_received: "Scholarship or honors received",
  graduate_degree_type: "Graduate degree type",
  graduate_degree_completed: "Degree completed",
  graduate_units_earned: "Units earned",
  eligibility_name: "Eligibility",
  exam_date: "Date of examination",
  exam_place: "Place of examination",
  license_no: "License number",
  license_valid_until: "License valid until",
  position_title: "Position title",
  department: "Department",
  monthly_salary: "Monthly salary",
  salary_grade: "Salary grade",
  status_of_appointment: "Status of appointment",
  organization_name_address: "Organization and address",
  hours: "Hours",
  position_nature: "Position or nature of work",
  title: "Title",
  conducted_by: "Conducted by",
  number_of_hours: "Number of hours",
  name: "Name",
  address: "Address",
  contact: "Contact number or email",
  answer: "Answer",
  details: "Details",
  country: "Country",
  case_status: "Case status",
};

export function asRecord(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export function hasContent(value: Json | undefined, key = ""): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return true;
  if (typeof value === "boolean") {
    return key === "answer" || key === "confirm_unrelated";
  }
  if (Array.isArray(value)) return value.some((entry) => hasContent(entry));

  return Object.entries(value).some(
    ([childKey, childValue]) =>
      !["id", "pds_version_id", "sort_order", "question_code"].includes(
        childKey,
      ) && hasContent(childValue, childKey),
  );
}

export function readableLabel(value: string) {
  return (
    FIELD_LABELS[value] ??
    value
      .replaceAll("_", " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

export function readableValue(value: string) {
  const country = COUNTRY_OPTIONS.find((option) => option.value === value);
  if (country) return country.label;
  if (/^[A-Z][A-Z_]+$/.test(value)) {
    return value
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  return value;
}

function SummaryValue({
  value,
  showEmpty,
}: {
  value: Json | undefined;
  showEmpty: boolean;
}) {
  if (value == null || value === "") {
    return showEmpty ? <span className="text-muted">Not provided</span> : null;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value);
    return readableValue(value);
  }
  return null;
}

const RECORD_TITLE_KEYS: Record<string, string[]> = {
  children: ["full_name"],
  education: ["level"],
  eligibility: ["eligibility_name"],
  workExperience: ["position_title"],
  voluntaryWork: ["organization_name_address"],
  learningDevelopment: ["title"],
  otherInfo: ["description"],
  references: ["name"],
};

function getRecordTitle(
  value: Record<string, Json | undefined>,
  collection: string,
  index: number,
) {
  const key = (RECORD_TITLE_KEYS[collection] ?? []).find((candidate) =>
    hasContent(value[candidate]),
  );
  const title = key ? value[key] : undefined;
  return typeof title === "string"
    ? readableValue(title)
    : `${readableLabel(collection)} ${index + 1}`;
}

function SummaryArray({
  value,
  collection,
  showEmpty,
  variant,
}: {
  value: Json[];
  collection: string;
  showEmpty: boolean;
  variant: "review" | "profile";
}) {
  const entries = showEmpty
    ? value
    : value.filter((entry) => hasContent(entry));

  if (entries.length === 0) {
    return <p className="text-sm text-muted">None recorded.</p>;
  }

  if (collection === "questionnaire") {
    return (
      <ul
        className={
          variant === "profile"
            ? "divide-y divide-line-subtle"
            : "divide-y divide-line"
        }
      >
        {entries.map((entry, index) => {
          const record = asRecord(entry);
          const code =
            typeof record.question_code === "string"
              ? record.question_code
              : "";
          const question = PDS_QUESTIONNAIRE_ITEMS.find(
            (item) => item.code === code,
          )?.question;
          const answer = record.answer;
          const details = Object.fromEntries(
            Object.entries(record).filter(
              ([key]) => !["answer", "question_code"].includes(key),
            ),
          );
          const hasDetails =
            showEmpty ||
            Object.entries(details).some(([key, item]) =>
              hasContent(item, key),
            );

          return (
            <li
              className={
                variant === "profile"
                  ? "grid gap-2 py-4 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  : "grid gap-2 py-3 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              }
              key={code || index}
            >
              <p className="text-sm leading-6 text-ink">
                {code && (
                  <span className="mr-2 font-semibold text-muted">{code}</span>
                )}
                {question ?? "Questionnaire response"}
              </p>
              <span
                className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  answer === true
                    ? "border-warning/20 bg-warning/10 text-warning"
                    : "border-line bg-panel-muted text-muted"
                }`}
              >
                {typeof answer === "boolean"
                  ? answer
                    ? "Yes"
                    : "No"
                  : "Not provided"}
              </span>
              {hasDetails && (
                <div className="sm:col-span-2 sm:pl-4">
                  <SummaryObject
                    showEmpty={showEmpty}
                    value={details}
                    variant={variant}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul
      className={
        variant === "profile" ? "space-y-4" : "divide-y divide-line"
      }
    >
      {entries.map((entry, index) => {
        const record = asRecord(entry);
        const title = getRecordTitle(record, collection, index);
        const titleKey = (RECORD_TITLE_KEYS[collection] ?? []).find((key) =>
          hasContent(record[key]),
        );
        const details = Object.fromEntries(
          Object.entries(record).filter(([key]) => key !== titleKey),
        );

        return (
          <li
            className={
              variant === "profile"
                ? "min-w-0"
                : "grid gap-x-4 gap-y-2 py-4 first:pt-0 sm:grid-cols-[minmax(7rem,0.7fr)_minmax(0,2fr)]"
            }
            key={index}
          >
            <h4
              className={
                variant === "profile"
                  ? "mb-2 text-sm font-medium text-ink"
                  : "text-sm font-semibold text-ink"
              }
            >
              {title}
            </h4>
            <div
              className={
                collection === "education" && variant !== "profile"
                  ? "sm:pl-3"
                  : undefined
              }
            >
              <SummaryObject
                fieldGridClassName={
                  collection === "education"
                    ? "sm:grid-cols-2 lg:grid-cols-3"
                    : undefined
                }
                showEmpty={collection === "education" || showEmpty}
                value={details}
                variant={variant}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function SummaryObject({
  value,
  showEmpty,
  fieldOrder,
  fieldGridClassName,
  variant = "review",
}: {
  value: Record<string, Json | undefined>;
  showEmpty: boolean;
  fieldOrder?: string[];
  fieldGridClassName?: string;
  variant?: "review" | "profile";
}) {
  const entries = Object.entries(value).filter(
    ([key, item]) =>
      ![
        "id",
        "pds_version_id",
        "sort_order",
        "question_code",
        "qualification_level",
      ].includes(key) &&
      (showEmpty || hasContent(item, key)),
  );
  const fields = entries.filter(
    ([, item]) =>
      item == null ||
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean",
  );
  if (fieldOrder) {
    const fieldRank = new Map(
      fieldOrder.map((fieldName, index) => [fieldName, index]),
    );
    fields.sort(
      ([left], [right]) =>
        (fieldRank.get(left) ?? fieldOrder.length) -
        (fieldRank.get(right) ?? fieldOrder.length),
    );
  }
  const groups = entries.filter(
    ([, item]) =>
      item != null && typeof item === "object" && !Array.isArray(item),
  );
  const collections = entries.filter(([, item]) => Array.isArray(item));

  if (entries.length === 0) {
    return showEmpty ? (
      <span className="text-muted">No information provided.</span>
    ) : null;
  }

  return (
    <div className={variant === "profile" ? "space-y-4" : "space-y-5"}>
      {fields.length > 0 && (
        <div
          className={
            variant === "profile"
              ? "rounded-sm bg-primary/5 p-4 sm:p-5"
              : undefined
          }
        >
          <dl
          className={`grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 ${
            fieldGridClassName ?? "lg:grid-cols-3"
          }`}
        >
          {fields.map(([key, item]) => (
            <div className="min-w-0" key={key}>
              <dt
                className={
                  variant === "profile"
                    ? "text-xs text-muted"
                    : "text-xs text-muted"
                }
              >
                {readableLabel(key)}
              </dt>
              <dd className="mt-1 break-words text-sm font-medium text-ink">
                <SummaryValue value={item} showEmpty={showEmpty} />
              </dd>
            </div>
          ))}
          </dl>
        </div>
      )}

      {groups.length > 0 && (
        <div
          className={`grid grid-cols-1 gap-x-8 gap-y-6 ${
            groups.length > 1 ? "lg:grid-cols-2" : ""
          }`}
        >
          {groups.map(([key, item]) => (
            <section
              aria-label={readableLabel(key)}
              className={
                variant === "profile"
                  ? "min-w-0 lg:col-span-full"
                  : "min-w-0"
              }
              key={key}
            >
              <h4
                className={
                  variant === "profile"
                    ? "mb-2 text-sm font-medium text-ink"
                    : "mb-3 text-base font-semibold text-ink"
                }
              >
                {readableLabel(key)}
              </h4>
              <SummaryObject
                showEmpty={showEmpty}
                value={asRecord(item)}
                variant={variant}
              />
            </section>
          ))}
        </div>
      )}

      {collections.map(([key, item]) => (
        <section
          aria-label={key === "children" ? readableLabel(key) : undefined}
          className="min-w-0"
          key={key}
        >
          {key === "children" && (
            <h4
              className={
                variant === "profile"
                  ? "mb-2 text-sm font-medium text-ink"
                  : "mb-3 text-base font-semibold text-ink"
              }
            >
              {readableLabel(key)}
            </h4>
          )}
          <SummaryArray
            collection={key}
            showEmpty={showEmpty}
            value={item as Json[]}
            variant={variant}
          />
        </section>
      ))}
    </div>
  );
}

export function PersonalInformationSummary({
  value,
  showEmpty,
  variant = "review",
}: {
  value: Record<string, Json | undefined>;
  showEmpty: boolean;
  variant?: "review" | "profile";
}) {
  const personalInfo = asRecord(value.personalInfo);
  const addresses = asRecord(value.addresses);
  const addressOrder = [
    "barangay",
    "province",
    "zip_code",
    "city_municipality",
    "house_block_lot_no",
    "street",
    "subdivision_village",
  ];
  const personalInfoOrder = [
    "email",
    "surname",
    "height_m",
    "first_name",
    "citizenship",
    "civil_status",
    "sex_at_birth",
    "date_of_birth",
    "place_of_birth",
    "middle_name",
    "name_extension",
    "civil_status_other",
    "weight_kg",
    "blood_type",
    "telephone_no",
    "mobile_no",
    "dual_citizenship_by",
    "dual_citizenship_country",
    "umid_no",
    "pagibig_no",
    "philhealth_no",
    "philsys_no",
    "tin_no",
    "agency_employee_no",
  ];

  return (
    <div className={variant === "profile" ? "space-y-4" : "space-y-7"}>
      <section className="min-w-0" aria-label="Personal Info">
        <h4
          className={
            variant === "profile"
              ? "mb-2 text-sm font-medium text-ink"
              : "mb-4 text-base font-semibold text-ink"
          }
        >
          Personal Info
        </h4>
        <SummaryObject
          fieldGridClassName="sm:grid-cols-2 lg:grid-cols-2"
          fieldOrder={personalInfoOrder}
          showEmpty={showEmpty}
          value={personalInfo}
          variant={variant}
        />
      </section>

      <section
        aria-label="Addresses"
        className={
          variant === "profile"
            ? "min-w-0"
            : "min-w-0 border-t border-line-subtle pt-6"
        }
      >
        <h4
          className={
            variant === "profile"
              ? "mb-2 text-sm font-medium text-ink"
              : "mb-4 text-base font-semibold text-ink"
          }
        >
          Addresses
        </h4>
        <div className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2">
          {(["permanent", "residential"] as const).map((type) => (
            <section className="min-w-0" key={type}>
              <h5 className="mb-3 text-sm font-medium text-muted">
                {type === "permanent" ? "Permanent" : "Residential"}
              </h5>
              <SummaryObject
                fieldGridClassName="sm:grid-cols-2 lg:grid-cols-2"
                fieldOrder={addressOrder}
                showEmpty={showEmpty}
                value={asRecord(addresses[type])}
                variant={variant}
              />
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}

