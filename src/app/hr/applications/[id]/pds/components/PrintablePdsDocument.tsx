import { PDS_QUESTIONNAIRE_ITEMS } from "@/constants/pds-questionnaire";
import type { Json } from "@/types/database";
import type { ReactNode } from "react";

type RecordValue = Record<string, Json | undefined>;
type Column = { label: string; key: string; render?: (row: RecordValue) => string };

function record(value: Json | undefined): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function rows(value: Json | undefined): RecordValue[] {
  return Array.isArray(value) ? value.map((item) => record(item)) : [];
}

function text(value: Json | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map((entry) => text(entry)).join(", ");
  if (typeof value === "object") return "—";
  return String(value);
}

function section(root: RecordValue, step: string, name: string) {
  return record(record(root[step])[name]);
}

function date(value: Json | undefined) {
  if (typeof value !== "string" || !value) return text(value);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

function Field({ label, value }: Readonly<{ label: string; value: Json | undefined }>) {
  return <div className="pds-field"><span>{label}</span><strong>{text(value)}</strong></div>;
}

function DataTable({ columns, data, empty = "No information provided." }: Readonly<{ columns: Column[]; data: RecordValue[]; empty?: string }>) {
  return data.length ? <table className="pds-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{data.map((row, index) => <tr key={`${index}-${text(row[columns[0]?.key])}`}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : column.key.includes("date") ? date(row[column.key]) : text(row[column.key])}</td>)}</tr>)}</tbody></table> : <p className="pds-empty">{empty}</p>;
}

function Section({ children, title }: Readonly<{ children: ReactNode; title: string }>) {
  return <section className="pds-section"><h2>{title}</h2>{children}</section>;
}

function Page({ children, number, applicantNumber }: Readonly<{ children: ReactNode; number: number; applicantNumber: string }>) {
  return <article className="pds-print-page"><header className="pds-document-header"><div><strong>REPUBLIC OF THE PHILIPPINES</strong><br />Civil Service Commission</div><div className="pds-form-number">CS Form No. 212<br />Revised Personal Data Sheet</div></header><div className="pds-page-title"><h1>PERSONAL DATA SHEET</h1><span>Page {number} of 4</span></div><p className="pds-applicant-number">Applicant No. {applicantNumber}</p>{children}<footer className="pds-footer">This form is for official recruitment use. Please review all entries and sign the oath section in person.</footer></article>;
}

export function PrintablePdsDocument({ applicantNumber, draftData, versionNumber }: Readonly<{ applicantNumber: string; draftData: Json; versionNumber: number }>) {
  const root = record(draftData);
  const personal = section(root, "1", "personalInfo");
  const addresses = section(root, "1", "addresses");
  const residential = record(addresses.residential);
  const permanent = record(addresses.permanent);
  const family = section(root, "2", "familyBackground");
  const children = rows(record(root["2"]).children);
  const education = rows(record(root["3"]).education);
  const eligibility = rows(record(root["4"]).eligibility);
  const work = rows(record(root["5"]).workExperience);
  const voluntary = rows(record(root["6"]).voluntaryWork);
  const learning = rows(record(root["7"]).learningDevelopment);
  const other = rows(record(root["8"]).otherInfo);
  const questionnaire = rows(record(root["9"]).questionnaire);
  const byQuestion = new Map(questionnaire.map((item) => [text(item.question_code), item]));
  const references = rows(record(root["10"]).references);

  return <div className="pds-print-root" data-version={versionNumber}>
    <Page applicantNumber={applicantNumber} number={1}>
      <Section title="I. Personal information"><div className="pds-grid">
        <Field label="Surname" value={personal.surname} /><Field label="First name" value={personal.first_name} /><Field label="Middle name" value={personal.middle_name} /><Field label="Name extension" value={personal.name_extension} /><Field label="Date of birth" value={date(personal.date_of_birth)} /><Field label="Place of birth" value={personal.place_of_birth} /><Field label="Sex at birth" value={personal.sex_at_birth} /><Field label="Civil status" value={personal.civil_status === "OTHER" ? personal.civil_status_other : personal.civil_status} /><Field label="Height (m)" value={personal.height_m} /><Field label="Weight (kg)" value={personal.weight_kg} /><Field label="Blood type" value={personal.blood_type} /><Field label="Citizenship" value={personal.citizenship} /><Field label="Dual citizenship by" value={personal.dual_citizenship_by} /><Field label="Dual citizenship country" value={personal.dual_citizenship_country} />
      </div><div className="pds-grid pds-grid-three"><Field label="GSIS / UMID No." value={personal.umid_no} /><Field label="PAG-IBIG No." value={personal.pagibig_no} /><Field label="PhilHealth No." value={personal.philhealth_no} /><Field label="PhilSys No." value={personal.philsys_no} /><Field label="TIN" value={personal.tin_no} /><Field label="Agency employee No." value={personal.agency_employee_no} /><Field label="Telephone" value={personal.telephone_no} /><Field label="Mobile" value={personal.mobile_no} /><Field label="Email" value={personal.email} /></div></Section>
      <Section title="II. Address"><div className="pds-grid pds-grid-two"><AddressFields address={residential} title="Residential" /><AddressFields address={permanent} title="Permanent" /></div></Section>
      <Section title="III. Family background"><div className="pds-grid pds-grid-three"><Field label="Spouse" value={fullName(family, "spouse")} /><Field label="Spouse occupation" value={family.spouse_occupation} /><Field label="Spouse employer" value={family.spouse_employer} /><Field label="Spouse business address" value={family.spouse_business_address} /><Field label="Spouse telephone" value={family.spouse_telephone_no} /><Field label="Father" value={fullName(family, "father")} /><Field label="Mother" value={fullName(family, "mother")} /></div><h3 className="pds-subtitle">Children</h3><DataTable columns={[{ label: "Full name", key: "full_name" }, { label: "Date of birth", key: "date_of_birth" }]} data={children} /></Section>
    </Page>
    <Page applicantNumber={applicantNumber} number={2}>
      <Section title="IV. Educational background"><DataTable columns={[{ label: "Level", key: "level" }, { label: "School", key: "school_name" }, { label: "Degree / course", key: "degree_course" }, { label: "Years", key: "period", render: (row) => `${text(row.period_from)} – ${text(row.period_to)}` }, { label: "Units earned", key: "highest_level_units_earned" }, { label: "Graduated", key: "year_graduated" }, { label: "Honors", key: "honors_received" }]} data={education} /></Section>
      <Section title="V. Civil service eligibility"><DataTable columns={[{ label: "Eligibility", key: "eligibility_name" }, { label: "Rating", key: "rating" }, { label: "Exam date", key: "exam_date" }, { label: "Exam place", key: "exam_place" }, { label: "License No.", key: "license_no" }, { label: "Valid until", key: "license_valid_until" }]} data={eligibility} /></Section>
      <Section title="VI. Work experience"><p className="pds-caption">Include private and government employment, starting with the most recent.</p><DataTable columns={[{ label: "Inclusive dates", key: "date_range", render: (row) => `${date(row.date_from)} – ${row.date_to ? date(row.date_to) : "Present"}` }, { label: "Position", key: "position_title" }, { label: "Agency / company", key: "agency_company" }, { label: "Salary", key: "monthly_salary" }, { label: "Grade / step", key: "salary_grade_step" }, { label: "Status", key: "appointment_status" }, { label: "Gov't service", key: "is_gov_service" }, { label: "Duties", key: "duties_description" }]} data={work} /></Section>
    </Page>
    <Page applicantNumber={applicantNumber} number={3}>
      <Section title="VII. Voluntary work"><DataTable columns={[{ label: "Organization and address", key: "organization_name_address" }, { label: "From", key: "date_from" }, { label: "To", key: "date_to" }, { label: "Hours", key: "hours" }, { label: "Position / nature", key: "position_nature" }]} data={voluntary} /></Section>
      <Section title="VIII. Learning and development"><DataTable columns={[{ label: "Title", key: "title" }, { label: "From", key: "date_from" }, { label: "To", key: "date_to" }, { label: "Hours", key: "hours" }, { label: "Type", key: "ld_type" }, { label: "Conducted by", key: "conducted_by" }]} data={learning} /></Section>
      <Section title="IX. Other information"><DataTable columns={[{ label: "Category", key: "category" }, { label: "Details", key: "description" }]} data={other} /></Section>
      <Section title="X. Questionnaire"><div className="pds-question-list">{PDS_QUESTIONNAIRE_ITEMS.map((question) => {
        const answer = byQuestion.get(question.code);
        return <div className="pds-question" key={question.code}><strong>{question.code}.</strong><span>{question.question}</span><b>{text(answer?.answer)}</b>{answer?.answer ? <small>{question.code === "39" ? `Country: ${text(answer.country)}` : [answer.details, answer.date_filed ? date(answer.date_filed) : null, answer.case_status, answer.id_no].filter(Boolean).map(text).join(" · ") || "Details: —"}</small> : null}</div>;
      })}</div></Section>
    </Page>
    <Page applicantNumber={applicantNumber} number={4}>
      <Section title="XI. References"><DataTable columns={[{ label: "Name", key: "name" }, { label: "Address", key: "address" }, { label: "Contact", key: "contact" }]} data={references} /></Section>
      <Section title="Declaration"><p className="pds-declaration">I declare under oath that the information I have provided in this Personal Data Sheet, including my answers to the questionnaire, is true and correct to the best of my knowledge. I authorize the Civil Service Commission and the agency to verify the information and supporting documents I have submitted.</p><p className="pds-declaration">I understand that any misrepresentation made in this Personal Data Sheet or in supporting documents may be a ground for administrative or criminal action.</p></Section>
      <div className="pds-signature-grid"><Signature label="Signature over printed name" /><Signature label="Date accomplished" /><Signature label="Government ID / ID number" /><Signature label="Date / place of issuance" /></div>
      <div className="pds-oath"><h2>SUBSCRIBED AND SWORN</h2><p>Subscribed and sworn to before me this ______ day of __________________, at ______________________________, Philippines.</p><Signature label="Administering officer / notary public" /><div className="pds-grid pds-grid-two"><Field label="Appointment / position" value={null} /><Field label="Commission / authority" value={null} /></div></div>
      <div className="pds-note"><strong>For HR use:</strong> Version {versionNumber} · Applicant No. {applicantNumber}. Applicant signature must be completed on the printed copy.</div>
    </Page>
  </div>;
}

function fullName(source: RecordValue, prefix: string) {
  return [source[`${prefix}_first_name`], source[`${prefix}_middle_name`], source[`${prefix}_surname`], source[`${prefix}_name_extension`]].filter((value) => typeof value === "string" && value).map(text).join(" ") || "—";
}

function AddressFields({ address, title }: Readonly<{ address: RecordValue; title: string }>) {
  return <div className="pds-address"><h3 className="pds-subtitle">{title}</h3><p>{[address.house_block_lot_no, address.street, address.subdivision_village, address.barangay, address.city_municipality, address.province, address.zip_code].filter((value) => typeof value === "string" && value).map(text).join(", ") || "—"}</p></div>;
}

function Signature({ label }: Readonly<{ label: string }>) {
  return <div className="pds-signature"><div />{label}</div>;
}
