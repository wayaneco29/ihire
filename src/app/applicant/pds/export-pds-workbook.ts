import "server-only";

import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import { join, posix } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COUNTRY_OPTIONS } from "@/constants/pds-options";
import type { Database, Tables } from "@/types/database";

type Client = SupabaseClient<Database>;
type Address = Tables<"pds_addresses">;
type Child = Tables<"pds_children">;
type Education = Tables<"pds_education">;
type Eligibility = Tables<"pds_eligibility">;
type Family = Tables<"pds_family_background">;
type Learning = Tables<"pds_learning_development">;
type OtherInfo = Tables<"pds_other_info">;
type PersonalInfo = Tables<"pds_personal_info">;
type Questionnaire = Tables<"pds_questionnaire">;
type Reference = Tables<"pds_references">;
type VoluntaryWork = Tables<"pds_voluntary_work">;
type WorkExperience = Tables<"pds_work_experience">;

type PdsData = {
  addresses: Address[];
  children: Child[];
  education: Education[];
  eligibility: Eligibility[];
  family: Family | null;
  learning: Learning[];
  otherInfo: OtherInfo[];
  personal: PersonalInfo | null;
  questionnaire: Questionnaire[];
  references: Reference[];
  voluntaryWork: VoluntaryWork[];
  workExperience: WorkExperience[];
};

type CellValue = string | number | boolean;
type SheetCells = Map<string, CellValue>;
type ContinuationSection = {
  title: string;
  headers: string[];
  entries: Array<Array<string | number>>;
};

function displayDate(value: string | null) {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function setCell(
  sheet: SheetCells,
  address: string,
  value: string | number | boolean | null | undefined,
) {
  if (value === null || value === undefined || value === "") return;
  sheet.set(address, value);
}

function setDate(sheet: SheetCells, address: string, value: string | null) {
  setCell(sheet, address, displayDate(value));
}

function addContinuation(
  sections: ContinuationSection[],
  title: string,
  headers: string[],
  entries: Array<Array<string | number>>,
) {
  if (!entries.length) return;
  sections.push({ title, headers, entries });
}

function fillPersonalInformation(
  sheets: Record<"C1" | "C2" | "C3" | "C4", SheetCells>,
  continuations: ContinuationSection[],
  data: PdsData,
) {
  const sheet = sheets.C1;
  const person = data.personal;
  const residential = data.addresses.find(
    (address) => address.type === "RESIDENTIAL",
  );
  const permanent = data.addresses.find(
    (address) => address.type === "PERMANENT",
  );

  if (person) {
    setCell(sheet, "D10", person.surname);
    setCell(sheet, "D11", person.first_name);
    setCell(sheet, "D12", person.middle_name);
    setCell(sheet, "L11", person.name_extension);
    setDate(sheet, "D13", person.date_of_birth);
    setCell(sheet, "D15", person.place_of_birth);
    if (person.civil_status === "OTHER")
      setCell(sheet, "D17", person.civil_status_other);
    if (person.civil_status === "SOLO_PARENT")
      setCell(sheet, "D17", "Solo Parent");
    setCell(sheet, "D22", person.height_m);
    setCell(sheet, "D24", person.weight_kg);
    setCell(sheet, "D25", person.blood_type);
    setCell(sheet, "D27", person.umid_no);
    setCell(sheet, "D29", person.pagibig_no);
    setCell(sheet, "D31", person.philhealth_no);
    setCell(sheet, "D32", person.philsys_no);
    setCell(sheet, "D33", person.tin_no);
    setCell(sheet, "D34", person.agency_employee_no);
    setCell(sheet, "I32", person.telephone_no);
    setCell(sheet, "I33", person.mobile_no);
    setCell(sheet, "I34", person.email);
  }

  const fillAddress = (
    address: Address | undefined,
    cells: {
      house: string;
      street: string;
      subdivision: string;
      barangay: string;
      city: string;
      province: string;
      zip: string;
    },
  ) => {
    if (!address) return;
    setCell(sheet, cells.house, address.house_block_lot_no);
    setCell(sheet, cells.street, address.street);
    setCell(sheet, cells.subdivision, address.subdivision_village);
    setCell(sheet, cells.barangay, address.barangay);
    setCell(sheet, cells.city, address.city_municipality);
    setCell(sheet, cells.province, address.province);
    setCell(sheet, cells.zip, address.zip_code);
  };
  fillAddress(residential, {
    house: "I17",
    street: "L17",
    subdivision: "I19",
    barangay: "L19",
    city: "I22",
    province: "L22",
    zip: "I24",
  });
  fillAddress(permanent, {
    house: "I25",
    street: "L25",
    subdivision: "I27",
    barangay: "L27",
    city: "I29",
    province: "L29",
    zip: "I31",
  });
  if (permanent?.same_as_residential) {
    fillAddress(residential, {
      house: "I25",
      street: "L25",
      subdivision: "I27",
      barangay: "L27",
      city: "I29",
      province: "L29",
      zip: "I31",
    });
  }

  const family = data.family;
  if (family) {
    setCell(sheet, "D36", family.spouse_surname);
    setCell(sheet, "D37", family.spouse_first_name);
    setCell(sheet, "D38", family.spouse_middle_name);
    setCell(sheet, "G37", family.spouse_name_extension);
    setCell(sheet, "D39", family.spouse_occupation);
    setCell(sheet, "D40", family.spouse_employer);
    setCell(sheet, "D41", family.spouse_business_address);
    setCell(sheet, "D42", family.spouse_telephone_no);
    setCell(sheet, "D43", family.father_surname);
    setCell(sheet, "D44", family.father_first_name);
    setCell(sheet, "D45", family.father_middle_name);
    setCell(sheet, "G44", family.father_name_extension);
    setCell(sheet, "D47", family.mother_surname);
    setCell(sheet, "D48", family.mother_first_name);
    setCell(sheet, "D49", family.mother_middle_name);
  }

  const childrenRows = data.children.map((child, index) => {
    const row = 37 + index;
    if (row <= 48) {
      setCell(sheet, `I${row}`, child.full_name);
      setDate(sheet, `M${row}`, child.date_of_birth);
    }
    return [child.full_name, displayDate(child.date_of_birth)];
  });
  addContinuation(
    continuations,
    "Children - Continuation",
    ["Full name", "Date of birth"],
    childrenRows.slice(12),
  );

  const educationRows: Array<Array<string | number>> = [];
  const educationRowByLevel: Record<Education["level"], number> = {
    ELEMENTARY: 54,
    SECONDARY: 55,
    VOCATIONAL_TRADE: 56,
    COLLEGE: 57,
    GRADUATE_STUDIES: 58,
  };
  const usedEducationRows = new Set<number>();
  const levelNames: Record<Education["level"], string> = {
    ELEMENTARY: "ELEMENTARY",
    SECONDARY: "SECONDARY",
    VOCATIONAL_TRADE: "VOCATIONAL / TRADE COURSE",
    COLLEGE: "COLLEGE",
    GRADUATE_STUDIES: "GRADUATE STUDIES",
  };
  for (const entry of data.education) {
    const row = educationRowByLevel[entry.level];
    const values = [
      levelNames[entry.level],
      entry.school_name ?? "",
      entry.degree_course ?? "",
      entry.period_from ?? "",
      entry.period_to ?? "",
      entry.highest_level_units_earned ?? "",
      entry.year_graduated ?? "",
      entry.honors_received ?? "",
      entry.graduate_degree_completed ? "Yes" : "No",
      entry.graduate_degree_type ?? "",
      entry.graduate_units_earned ?? "",
    ] as Array<string | number>;
    if (!usedEducationRows.has(row)) {
      usedEducationRows.add(row);
      setCell(sheet, `D${row}`, entry.school_name);
      setCell(sheet, `G${row}`, entry.degree_course);
      setCell(sheet, `J${row}`, entry.period_from);
      setCell(sheet, `K${row}`, entry.period_to);
      setCell(sheet, `L${row}`, entry.highest_level_units_earned);
      setCell(sheet, `M${row}`, entry.year_graduated);
      setCell(sheet, `N${row}`, entry.honors_received);
    } else {
      educationRows.push(values);
    }
  }
  addContinuation(
    continuations,
    "Education - Continuation",
    [
      "Level",
      "School",
      "Degree or course",
      "From",
      "To",
      "Units earned",
      "Year graduated",
      "Honors",
      "Graduate degree completed",
      "Graduate degree type",
      "Graduate units earned",
    ],
    educationRows,
  );
  const graduateDetails = data.education.filter(
    (entry) =>
      entry.graduate_degree_completed !== null ||
      entry.graduate_degree_type ||
      entry.graduate_units_earned !== null,
  );
  addContinuation(
    continuations,
    "Graduate Education Details",
    [
      "Level",
      "Graduate degree completed",
      "Graduate degree type",
      "Graduate units earned",
    ],
    graduateDetails.map((entry) => [
      entry.level,
      entry.graduate_degree_completed ? "Yes" : "No",
      entry.graduate_degree_type ?? "",
      entry.graduate_units_earned ?? "",
    ]),
  );
}

function fillEligibilityAndWork(
  sheets: Record<"C1" | "C2" | "C3" | "C4", SheetCells>,
  continuations: ContinuationSection[],
  data: PdsData,
) {
  const sheet = sheets.C2;
  const eligibilityRows = data.eligibility.map((entry, index) => {
    const row = 5 + index;
    if (row <= 11) {
      setCell(sheet, `A${row}`, entry.eligibility_name);
      setCell(sheet, `F${row}`, entry.rating);
      setDate(sheet, `G${row}`, entry.exam_date);
      setCell(sheet, `I${row}`, entry.exam_place);
      setCell(sheet, `L${row}`, entry.license_no);
      setDate(sheet, `M${row}`, entry.license_valid_until);
    }
    return [
      entry.eligibility_name,
      entry.rating ?? "",
      displayDate(entry.exam_date),
      entry.exam_place ?? "",
      entry.license_no ?? "",
      displayDate(entry.license_valid_until),
    ];
  });
  addContinuation(
    continuations,
    "Eligibility - Continuation",
    [
      "Eligibility",
      "Rating",
      "Exam date",
      "Exam place",
      "License number",
      "Valid until",
    ],
    eligibilityRows.slice(7),
  );

  const workRows = data.workExperience.map((entry, index) => {
    const row = 18 + index;
    if (row <= 45) {
      setDate(sheet, `A${row}`, entry.date_from);
      setCell(
        sheet,
        `C${row}`,
        entry.date_to ? displayDate(entry.date_to) : "Present",
      );
      setCell(sheet, `D${row}`, entry.position_title);
      setCell(sheet, `G${row}`, entry.agency_company);
      setCell(sheet, `J${row}`, entry.monthly_salary);
      setCell(sheet, `K${row}`, entry.salary_grade_step);
      setCell(sheet, `L${row}`, entry.appointment_status);
      setCell(sheet, `M${row}`, entry.is_gov_service ? "Y" : "N");
    }
    return [
      displayDate(entry.date_from),
      entry.date_to ? displayDate(entry.date_to) : "Present",
      entry.position_title,
      entry.agency_company,
      entry.monthly_salary ?? "",
      entry.salary_grade_step ?? "",
      entry.appointment_status ?? "",
      entry.is_gov_service ? "Yes" : "No",
      entry.duties_description ?? "",
    ];
  });
  addContinuation(
    continuations,
    "Work - Continuation",
    [
      "From",
      "To",
      "Position",
      "Agency or company",
      "Monthly salary",
      "Salary grade / step",
      "Appointment status",
      "Government service",
      "Duties",
    ],
    workRows.slice(28),
  );
  const workWithDuties = data.workExperience.filter(
    (entry) => entry.duties_description,
  );
  addContinuation(
    continuations,
    "Work Duties",
    ["Position", "Agency or company", "Duties description"],
    workWithDuties.map((entry) => [
      entry.position_title,
      entry.agency_company,
      entry.duties_description ?? "",
    ]),
  );
}

function fillVoluntaryLearningAndOther(
  sheets: Record<"C1" | "C2" | "C3" | "C4", SheetCells>,
  continuations: ContinuationSection[],
  data: PdsData,
) {
  const sheet = sheets.C3;
  const voluntaryRows = data.voluntaryWork.map((entry, index) => {
    const row = 6 + index;
    if (row <= 12) {
      setCell(sheet, `A${row}`, entry.organization_name_address);
      setDate(sheet, `E${row}`, entry.date_from);
      setDate(sheet, `F${row}`, entry.date_to);
      setCell(sheet, `G${row}`, entry.hours);
      setCell(sheet, `H${row}`, entry.position_nature);
    }
    return [
      entry.organization_name_address,
      displayDate(entry.date_from),
      displayDate(entry.date_to),
      entry.hours ?? "",
      entry.position_nature ?? "",
    ];
  });
  addContinuation(
    continuations,
    "Voluntary Work - Continuation",
    ["Organization and address", "From", "To", "Hours", "Position / nature"],
    voluntaryRows.slice(7),
  );

  const learningRows = data.learning.map((entry, index) => {
    const row = 18 + index;
    if (row <= 38) {
      setCell(sheet, `A${row}`, entry.title);
      setDate(sheet, `E${row}`, entry.date_from);
      setDate(sheet, `F${row}`, entry.date_to);
      setCell(sheet, `G${row}`, entry.hours);
      setCell(sheet, `H${row}`, entry.ld_type);
      setCell(sheet, `I${row}`, entry.conducted_by);
    }
    return [
      entry.title,
      displayDate(entry.date_from),
      displayDate(entry.date_to),
      entry.hours ?? "",
      entry.ld_type ?? "",
      entry.conducted_by ?? "",
    ];
  });
  addContinuation(
    continuations,
    "Learning - Continuation",
    ["Title", "From", "To", "Hours", "Type", "Conducted by"],
    learningRows.slice(21),
  );

  const otherInfo = {
    SKILL_HOBBY: data.otherInfo.filter(
      (entry) => entry.category === "SKILL_HOBBY",
    ),
    RECOGNITION: data.otherInfo.filter(
      (entry) => entry.category === "RECOGNITION",
    ),
    MEMBERSHIP: data.otherInfo.filter(
      (entry) => entry.category === "MEMBERSHIP",
    ),
  };
  const maxOtherRows = Math.max(
    ...Object.values(otherInfo).map((entries) => entries.length),
  );
  for (let index = 0; index < maxOtherRows; index += 1) {
    const row = 42 + index;
    if (row <= 48) {
      setCell(sheet, `A${row}`, otherInfo.SKILL_HOBBY[index]?.description);
      setCell(sheet, `C${row}`, otherInfo.RECOGNITION[index]?.description);
      setCell(sheet, `I${row}`, otherInfo.MEMBERSHIP[index]?.description);
    }
  }
  const otherCount = Math.max(0, maxOtherRows - 7);
  addContinuation(
    continuations,
    "Other Information - Continuation",
    ["Skills and hobbies", "Distinctions / recognition", "Memberships"],
    Array.from({ length: otherCount }, (_, offset) => {
      const index = offset + 7;
      return [
        otherInfo.SKILL_HOBBY[index]?.description ?? "",
        otherInfo.RECOGNITION[index]?.description ?? "",
        otherInfo.MEMBERSHIP[index]?.description ?? "",
      ];
    }),
  );
}

function fillQuestionnaireAndReferences(
  sheets: Record<"C1" | "C2" | "C3" | "C4", SheetCells>,
  continuations: ContinuationSection[],
  data: PdsData,
) {
  const sheet = sheets.C4;
  const answers = new Map(
    data.questionnaire.map((entry) => [entry.question_code, entry]),
  );
  const locations: Record<string, string> = {
    "34A": "I11",
    "34B": "I12",
    "35A": "I15",
    "35B": "I22",
    "36": "I25",
    "37": "I29",
    "38A": "K32",
    "38B": "K35",
    "39": "I39",
    "40A": "I44",
    "40B": "I46",
    "40C": "I48",
  };
  for (const [code, location] of Object.entries(locations)) {
    const entry = answers.get(code as Questionnaire["question_code"]);
    if (!entry?.answer) continue;
    const details =
      code === "39"
        ? (COUNTRY_OPTIONS.find((option) => option.value === entry.details)
            ?.label ?? entry.details)
        : code === "40B" || code === "40C"
          ? entry.id_no
          : entry.details;
    setCell(sheet, location, details);
  }
  const charged = answers.get("35B");
  if (charged?.answer) {
    setDate(sheet, "J20", charged.date_filed);
    setCell(sheet, "J21", charged.case_status);
  }

  data.references.forEach((reference, index) => {
    const row = 52 + index;
    if (row <= 54) {
      setCell(sheet, `A${row}`, reference.name);
      setCell(sheet, `F${row}`, reference.address);
      setCell(sheet, `G${row}`, reference.contact);
    }
  });
  addContinuation(
    continuations,
    "References - Continuation",
    ["Name", "Office / residential address", "Contact or email"],
    data.references
      .slice(3)
      .map((reference) => [
        reference.name,
        reference.address,
        reference.contact,
      ]),
  );
  addContinuation(
    continuations,
    "Questionnaire Details",
    ["Question", "Answer", "Details", "Date filed", "Case status", "ID number"],
    data.questionnaire.map((entry) => [
      entry.question_code,
      entry.answer ? "Yes" : "No",
      entry.details ?? "",
      displayDate(entry.date_filed),
      entry.case_status ?? "",
      entry.id_no ?? "",
    ]),
  );
}

// IDs come from the labeled YES/NO controls and their anchors in C4.
const questionnaireCheckboxes: Record<
  Questionnaire["question_code"],
  readonly [number, number]
> = {
  "34A": [1025, 1026],
  "34B": [1027, 1028],
  "35A": [1029, 1030],
  "35B": [1031, 1032],
  "36": [1033, 1034],
  "37": [1035, 1036],
  "38A": [1050, 1051],
  "38B": [1052, 1053],
  "39": [1037, 1038],
  "40A": [1039, 1042],
  "40B": [1040, 1043],
  "40C": [1041, 1044],
};

// Keys are Excel control names. Checkboxes take a boolean and dropdowns take a list index.
type FormControls = Map<string, boolean | number>;

function personalControls(
  person: PersonalInfo | null,
  countryIndex: number,
): FormControls {
  const dual = person?.citizenship === "DUAL";
  const civil = person?.civil_status;
  return new Map<string, boolean | number>([
    ["Check Box 25", person?.sex_at_birth === "MALE"],
    ["Check Box 26", person?.sex_at_birth === "FEMALE"],
    ["Check Box 21", person?.citizenship === "FILIPINO"],
    ["Check Box 22", dual],
    ["Check Box 39", dual && person.dual_citizenship_by === "BY_BIRTH"],
    ["Check Box 40", dual && person.dual_citizenship_by === "BY_NATURALIZATION"],
    ["Drop Down 31", countryIndex],
    ["Check Box 34", civil === "SINGLE"],
    ["Check Box 35", civil === "MARRIED"],
    ["Check Box 36", civil === "WIDOWED"],
    ["Check Box 37", civil === "OTHER" || civil === "SOLO_PARENT"],
    ["Check Box 38", civil === "SEPARATED"],
  ]);
}

function questionnaireControls(entries: Questionnaire[]): FormControls {
  const answers = new Map<string, boolean>(
    entries.map((entry) => [entry.question_code, entry.answer]),
  );
  const controls: FormControls = new Map();
  for (const [code, [yes, no]] of Object.entries(questionnaireCheckboxes)) {
    const answer = answers.get(code);
    controls.set(`Check Box ${yes}`, answer === true);
    controls.set(`Check Box ${no}`, answer === false);
  }
  return controls;
}

function readTemplateXml(zip: JSZip, path: string) {
  const file = zip.file(path);
  if (!file) throw new Error(`PDS template file ${path} is missing.`);
  return file.async("string");
}

async function writeFormControls(
  zip: JSZip,
  sheetNumber: 1 | 4,
  sheet: string,
  controls: FormControls,
) {
  const relationships = await readTemplateXml(
    zip,
    `xl/worksheets/_rels/sheet${sheetNumber}.xml.rels`,
  );
  const targets = new Map<string, string>();
  for (const match of relationships.matchAll(/<Relationship\b[^>]*\/>/g)) {
    const id = /\bId="([^"]+)"/.exec(match[0])?.[1];
    const target = /\bTarget="([^"]+)"/.exec(match[0])?.[1];
    if (id && target)
      targets.set(id, posix.normalize(`xl/worksheets/${target}`));
  }
  // Excel keeps each control's state in both the VML drawing and a ctrlProp part.
  const drawingId = /<legacyDrawing\b[^>]*\br:id="([^"]+)"/.exec(sheet)?.[1];
  const vmlPath = targets.get(drawingId ?? "");
  if (!vmlPath)
    throw new Error(`PDS sheet C${sheetNumber} has no control drawing.`);
  const vml = await readTemplateXml(zip, vmlPath);
  const updatedDrawing = vml.replace(
    /<v:shape\b[^>]*\bid="([^"]+)"[^>]*>[\s\S]*?<\/v:shape>/g,
    (shape, id: string) => {
      const value = controls.get(id.replaceAll("_x0020_", " "));
      if (value === undefined) return shape;
      if (typeof value === "number") {
        return shape.replace(
          /<x:Sel>[^<]*<\/x:Sel>/,
          `<x:Sel>${value}</x:Sel>`,
        );
      }
      const unchecked = shape.replace(/<x:Checked>[^<]*<\/x:Checked>/g, "");
      return value
        ? unchecked.replace(
            /(?=<x:NoThreeD\s*\/>|<\/x:ClientData>)/,
            "<x:Checked>1</x:Checked>",
          )
        : unchecked;
    },
  );
  zip.file(vmlPath, updatedDrawing);

  for (const [tag] of sheet.matchAll(/<control\b[^>]*>/g)) {
    const name = /\bname="([^"]+)"/.exec(tag)?.[1] ?? "";
    const value = controls.get(name);
    if (value === undefined) continue;
    const relationship = /\br:id="([^"]+)"/.exec(tag)?.[1];
    const path = targets.get(relationship ?? "");
    if (!path?.startsWith("xl/ctrlProps/"))
      throw new Error(`PDS control ${name} has no control properties.`);
    const xml = await readTemplateXml(zip, path);
    if (typeof value === "number") {
      zip.file(path, xml.replace(/\bsel="[^"]*"/, `sel="${value}"`));
    } else {
      // Excel omits the checked attribute for an unchecked box.
      const unchecked = xml.replace(/\s+checked="[^"]*"/, "");
      const updated = value
        ? unchecked.replace(
            'objectType="CheckBox"',
            'objectType="CheckBox" checked="Checked"',
          )
        : unchecked;
      zip.file(path, updated);
    }
  }
}

async function removeInvalidC4PrinterSettings(zip: JSZip) {
  // Excel's recovery log flags the template's C4 printerSettings4.bin.
  // Keep the portable page setup attributes; discard only the device-specific
  // printer data and its relationship, including references in custom views.
  const sheetPath = "xl/worksheets/sheet4.xml";
  const relsPath = "xl/worksheets/_rels/sheet4.xml.rels";
  const sheetFile = zip.file(sheetPath);
  const relsFile = zip.file(relsPath);
  if (!sheetFile || !relsFile)
    throw new Error("PDS C4 worksheet relationships are missing.");
  let sheet = await sheetFile.async("string");
  const ids = new Set<string>();
  const relationships = (await relsFile.async("string")).replace(
    /<Relationship\b[^>]*\/>/g,
    (relationship) => {
      if (!/\bType="[^"]*\/printerSettings"/.test(relationship))
        return relationship;
      const id = /\bId="([^"]+)"/.exec(relationship)?.[1];
      const target = /\bTarget="([^"]+)"/.exec(relationship)?.[1];
      if (!id || !target)
        throw new Error("Malformed PDS C4 printer relationship.");
      const path = posix.normalize(`xl/worksheets/${target}`);
      if (!path.startsWith("xl/printerSettings/"))
        throw new Error("Unexpected PDS printer settings path.");
      ids.add(id);
      zip.remove(path);
      return "";
    },
  );
  sheet = sheet.replace(/<pageSetup\b[^>]*>/g, (tag) =>
    tag.replace(/\s+r:id="([^"]+)"/g, (attribute, id: string) =>
      ids.has(id) ? "" : attribute,
    ),
  );
  zip.file(sheetPath, sheet);
  zip.file(relsPath, relationships);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function replaceCell(xml: string, address: string, value: CellValue) {
  const escapedAddress = address.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Keep the slash out of the attributes match: otherwise a self-closing
  // styled cell can consume the following cell and delete its value/borders.
  const pattern = new RegExp(
    `<c\\b(?=[^>]*\\br="${escapedAddress}"(?:\\s|/?>))[^>/]*(?:/>|>[\\s\\S]*?</c>)`,
  );
  const match = xml.match(pattern);
  if (match) {
    const original = match[0];
    const end = original.indexOf(">");
    const openTag = original
      .slice(0, end + 1)
      .replace(/\s*\/>$/, ">")
      .replace(/\s+t="[^"]*"/, "");
    const valueXml =
      typeof value === "string"
        ? ` t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is>`
        : `><v>${value}</v>`;
    const updated = `${openTag.slice(0, -1)}${valueXml}</c>`;
    return xml.replace(pattern, () => updated);
  }

  const [, column, rowNumber] = /^([A-Z]+)(\d+)$/.exec(address) ?? [];
  if (!column || !rowNumber)
    throw new Error(`Invalid PDS cell address ${address}.`);

  const targetColumn = columnNumber(column);
  const nearbyCells = [...xml.matchAll(/<c\b([^>]*)>/g)]
    .map((cellMatch) => {
      const reference = /\br="([A-Z]+)(\d+)"/.exec(cellMatch[1]);
      if (!reference || reference[1] !== column) return null;
      const style = /\bs="(\d+)"/.exec(cellMatch[1])?.[1];
      return style
        ? {
            distance: Math.abs(Number(reference[2]) - Number(rowNumber)),
            row: Number(reference[2]),
            style,
          }
        : null;
    })
    .filter(
      (cell): cell is { distance: number; row: number; style: string } =>
        cell !== null,
    )
    .sort(
      (first, second) =>
        first.distance - second.distance || second.row - first.row,
    );
  const style = nearbyCells[0]?.style;
  const styleAttribute = style ? ` s="${style}"` : "";
  const cellValue =
    typeof value === "string"
      ? `<c r="${address}"${styleAttribute} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
      : `<c r="${address}"${styleAttribute}><v>${value}</v></c>`;

  const rowParts = findRow(xml, Number(rowNumber));
  const rowCellsPattern =
    /<c\b[^>/]*\br="([A-Z]+)\d+"[^>/]*(?:\/>|>[\s\S]*?<\/c>)/g;
  let insertionIndex = rowParts.content.length;
  for (const cellMatch of rowParts.content.matchAll(rowCellsPattern)) {
    const cellColumn = /^<c\b[^>]*\br="([A-Z]+)\d+"/.exec(cellMatch[0])?.[1];
    if (cellColumn && columnNumber(cellColumn) > targetColumn) {
      insertionIndex = cellMatch.index ?? insertionIndex;
      break;
    }
  }
  const updatedContent = `${rowParts.content.slice(0, insertionIndex)}${cellValue}${rowParts.content.slice(insertionIndex)}`;
  if (rowParts.start === -1) {
    const rowXml = `<row r="${rowNumber}">${updatedContent}</row>`;
    const insertAt = rowParts.insertAt;
    return `${xml.slice(0, insertAt)}${rowXml}${xml.slice(insertAt)}`;
  }
  return `${xml.slice(0, rowParts.start)}${rowParts.opening}${updatedContent}</row>${xml.slice(rowParts.end + 6)}`;
}

function findRow(xml: string, targetRow: number) {
  const openingRows = [...xml.matchAll(/<row\b[^>]*>/g)];
  for (const row of openingRows) {
    const number = /\br="(\d+)"/.exec(row[0])?.[1];
    if (Number(number) !== targetRow) continue;
    const start = row.index ?? -1;
    const contentStart = start + row[0].length;
    const closingAt = xml.indexOf("</row>", contentStart);
    if (start < 0 || closingAt < 0)
      throw new Error(`Malformed PDS template row ${targetRow}.`);
    return {
      start,
      end: closingAt,
      opening: row[0],
      content: xml.slice(contentStart, closingAt),
      insertAt: -1,
    };
  }
  const nextRow = openingRows.find(
    (row) => Number(/\br="(\d+)"/.exec(row[0])?.[1]) > targetRow,
  );
  const insertAt = nextRow?.index ?? xml.indexOf("</sheetData>");
  if (insertAt < 0) throw new Error("PDS template sheet data is missing.");
  return { start: -1, end: -1, opening: "", content: "", insertAt };
}

function columnNumber(column: string) {
  return [...column].reduce(
    (total, character) => total * 26 + character.charCodeAt(0) - 64,
    0,
  );
}

function applySheetCells(xml: string, cells: SheetCells) {
  let updated = xml;
  for (const [address, value] of cells)
    updated = replaceCell(updated, address, value);
  return updated;
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function readTextRuns(xml: string) {
  return Array.from(
    xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g),
    ([, text]) => decodeXml(text),
  ).join("").trim();
}

function selectCitizenshipCountry(
  person: PersonalInfo | null,
  sheet: string,
  sharedStrings: string,
  cells: SheetCells,
) {
  const saved = person?.dual_citizenship_country?.trim();
  if (person?.citizenship !== "DUAL" || !saved) return 0;
  const code = saved.toUpperCase();
  const country = COUNTRY_OPTIONS.find((option) => option.value === code)?.label ?? saved;

  // Drop Down 31 uses C1!Q11:Q216. The prompt in Q11 counts as item 1.
  const firstRow = 11;
  const lastRow = 216;
  const strings = Array.from(
    sharedStrings.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g),
    ([, item]) => readTextRuns(item),
  );
  const names = new Intl.Collator("en", { sensitivity: "base" });
  const countryCells = /<c\b[^>/]*\br="Q(\d+)"[^>/]*>([\s\S]*?)<\/c>/g;
  for (const [, rowText, content] of sheet.matchAll(countryCells)) {
    const row = Number(rowText);
    if (row <= firstRow || row > lastRow) continue;
    const index = /<v>(\d+)<\/v>/.exec(content)?.[1];
    const label =
      index === undefined ? readTextRuns(content) : strings[Number(index)];
    if (label && names.compare(label, country) === 0) return row - firstRow + 1;
  }

  // Q14 is an empty item in this template. Use it for a country the form
  // accepts but the workbook omits, such as the United States.
  const emptyRow = 14;
  setCell(cells, `Q${emptyRow}`, country);
  return emptyRow - firstRow + 1;
}

function inlineCell(address: string, value: string | number) {
  return typeof value === "number"
    ? `<c r="${address}"><v>${value}</v></c>`
    : `<c r="${address}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function continuationXml(sections: ContinuationSection[]) {
  const rows: string[] = [];
  let rowNumber = 1;
  for (const section of sections) {
    rows.push(
      `<row r="${rowNumber}">${inlineCell(`A${rowNumber}`, section.title)}</row>`,
    );
    rowNumber += 1;
    rows.push(
      `<row r="${rowNumber}">${section.headers.map((header, index) => inlineCell(`${columnName(index + 1)}${rowNumber}`, header)).join("")}</row>`,
    );
    rowNumber += 1;
    for (const entry of section.entries) {
      rows.push(
        `<row r="${rowNumber}">${entry.map((value, index) => inlineCell(`${columnName(index + 1)}${rowNumber}`, value)).join("")}</row>`,
      );
      rowNumber += 1;
    }
    rowNumber += 1;
  }
  return rows.join("");
}

function columnName(number: number) {
  let result = "";
  while (number > 0) {
    const remainder = (number - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    number = Math.floor((number - 1) / 26);
  }
  return result;
}

function setContinuationSheet(xml: string, sections: ContinuationSection[]) {
  const rows = continuationXml(sections);
  const rowMatches = [...rows.matchAll(/<row r="(\d+)"/g)];
  const lastRow = Math.max(
    1,
    Number(rowMatches[rowMatches.length - 1]?.[1] ?? 1),
  );
  const lastColumn = Math.max(
    1,
    ...sections.map((section) => section.headers.length),
  );
  const dimension = `<dimension ref="A1:${columnName(lastColumn)}${lastRow}"/>`;
  const withDimension = xml.replace(/<dimension\b[^>]*\/>/, dimension);
  return withDimension
    .replace(/<sheetData\b[^>]*\/>/, `<sheetData>${rows}</sheetData>`)
    .replace(
      /<sheetData\b[^>]*>[\s\S]*?<\/sheetData>/,
      `<sheetData>${rows}</sheetData>`,
    );
}

export async function createPdsWorkbook(
  supabase: Client,
  pdsVersionId: string,
) {
  const queries = await Promise.all([
    supabase
      .from("pds_personal_info")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .maybeSingle(),
    supabase
      .from("pds_addresses")
      .select("*")
      .eq("pds_version_id", pdsVersionId),
    supabase
      .from("pds_family_background")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .maybeSingle(),
    supabase
      .from("pds_children")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .order("sort_order"),
    supabase
      .from("pds_education")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .order("sort_order"),
    supabase
      .from("pds_eligibility")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .order("sort_order"),
    supabase
      .from("pds_work_experience")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .order("sort_order"),
    supabase
      .from("pds_voluntary_work")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .order("sort_order"),
    supabase
      .from("pds_learning_development")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .order("sort_order"),
    supabase
      .from("pds_other_info")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .order("sort_order"),
    supabase
      .from("pds_questionnaire")
      .select("*")
      .eq("pds_version_id", pdsVersionId),
    supabase
      .from("pds_references")
      .select("*")
      .eq("pds_version_id", pdsVersionId)
      .order("sort_order"),
  ]);
  if (queries.some((query) => query.error)) return null;

  const [
    personal,
    addresses,
    family,
    children,
    education,
    eligibility,
    workExperience,
    voluntaryWork,
    learning,
    otherInfo,
    questionnaire,
    references,
  ] = queries;
  const data: PdsData = {
    personal: personal.data,
    addresses: addresses.data ?? [],
    family: family.data,
    children: children.data ?? [],
    education: education.data ?? [],
    eligibility: eligibility.data ?? [],
    workExperience: workExperience.data ?? [],
    voluntaryWork: voluntaryWork.data ?? [],
    learning: learning.data ?? [],
    otherInfo: otherInfo.data ?? [],
    questionnaire: questionnaire.data ?? [],
    references: references.data ?? [],
  };

  const template = await readFile(
    join(process.cwd(), "src/templates/pds/pds-template.xlsx"),
  );
  const zip = await JSZip.loadAsync(template);
  const sheets = {
    C1: new Map<string, CellValue>(),
    C2: new Map<string, CellValue>(),
    C3: new Map<string, CellValue>(),
    C4: new Map<string, CellValue>(),
  };
  const continuations: ContinuationSection[] = [];
  fillPersonalInformation(sheets, continuations, data);
  fillEligibilityAndWork(sheets, continuations, data);
  fillVoluntaryLearningAndOther(sheets, continuations, data);
  fillQuestionnaireAndReferences(sheets, continuations, data);

  for (const [index, name] of (["C1", "C2", "C3", "C4"] as const).entries()) {
    const path = `xl/worksheets/sheet${index + 1}.xml`;
    const xml = await readTemplateXml(zip, path);
    if (name === "C1") {
      const countryIndex = selectCitizenshipCountry(
        data.personal,
        xml,
        await readTemplateXml(zip, "xl/sharedStrings.xml"),
        sheets.C1,
      );
      await writeFormControls(
        zip, 1, xml, personalControls(data.personal, countryIndex),
      );
    } else if (name === "C4") {
      await writeFormControls(
        zip, 4, xml, questionnaireControls(data.questionnaire),
      );
    }
    zip.file(path, applySheetCells(xml, sheets[name]));
  }

  await removeInvalidC4PrinterSettings(zip);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
