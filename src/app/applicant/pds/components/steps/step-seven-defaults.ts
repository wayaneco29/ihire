import dayjs from "dayjs";
import { LEARNING_DEVELOPMENT_TYPE_OPTIONS } from "@/constants/pds-options";
import type { Json } from "@/types/database";
import type { PdsStepSevenValues } from "../../schema";

const KNOWN_TYPES = LEARNING_DEVELOPMENT_TYPE_OPTIONS.map((option) => option.value).filter(
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

export function createStepSevenDefaults(draftData: Json): PdsStepSevenValues {
  const steps = asRecord(draftData);
  const step = asRecord(steps["7"] ?? null);
  const rows = Array.isArray(step.learningDevelopment)
    ? step.learningDevelopment
    : [];

  return {
    learningDevelopment: rows.flatMap((value) => {
      const row = asRecord(value);
      const title = asString(row.title);
      const from = asDate(row.date_from);
      const to = asDate(row.date_to);
      const hours = asNumber(row.hours);
      const type = asString(row.ld_type);
      const typeOther = asString(row.ld_type_other);
      const conductedBy = asString(row.conducted_by);
      if (!title && !from && !to && hours === null && !type && !conductedBy) {
        return [];
      }
      const knownType = KNOWN_TYPES.some((known) => known === type);
      return [
        {
          title,
          date_from: from,
          date_to: to,
          hours,
          ld_type: knownType ? type : type ? "Other" : "",
          ld_type_other: knownType
            ? ""
            : type === "Other"
              ? typeOther
              : type,
          conducted_by: conductedBy,
        },
      ];
    }),
  };
}
