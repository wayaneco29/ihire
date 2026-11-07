import dayjs from "dayjs";
import { APPOINTMENT_STATUS_OPTIONS } from "@/constants/pds-options";
import type { Json } from "@/types/database";
import type { PdsStepFiveValues } from "../../schema";

const KNOWN_STATUSES = APPOINTMENT_STATUS_OPTIONS.map((option) => option.value).filter(
  (value) => value !== "Other",
);

function asRecord(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function asString(value: Json | undefined) {
  return typeof value === "string" ? value : "";
}

function asDate(value: Json | undefined) {
  if (typeof value !== "string" || !value) return null;
  return dayjs(value).isValid() ? dayjs(value) : null;
}

function asNumber(value: Json | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

export function createStepFiveDefaults(draftData: Json): PdsStepFiveValues {
  const steps = asRecord(draftData);
  const step = asRecord(steps["5"] ?? null);
  const rows = Array.isArray(step.workExperience) ? step.workExperience : [];

  return {
    workExperience: rows.flatMap((value) => {
      const row = asRecord(value);
      const dateFrom = asDate(row.date_from);
      const dateTo = asDate(row.date_to);
      const position = asString(row.position_title);
      const agency = asString(row.agency_company);
      const status = asString(row.appointment_status);
      const otherStatus = asString(row.appointment_status_other);
      const knownStatus = KNOWN_STATUSES.some((knownStatus) => knownStatus === status);
      if (!dateFrom && !position && !agency && !status) return [];
      return [
        {
          date_from: dateFrom,
          date_to: dateTo,
          position_title: position,
          agency_company: agency,
          monthly_salary: asNumber(row.monthly_salary),
          salary_grade_step: asString(row.salary_grade_step),
          appointment_status: knownStatus ? status : status ? "Other" : "",
          appointment_status_other: knownStatus
            ? ""
            : status === "Other"
              ? otherStatus
              : status,
          is_gov_service:
            typeof row.is_gov_service === "boolean" ? row.is_gov_service : null,
          duties_description: asString(row.duties_description),
        },
      ];
    }),
  };
}
