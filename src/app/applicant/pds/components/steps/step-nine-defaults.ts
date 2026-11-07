import dayjs from "dayjs";
import { PDS_QUESTIONNAIRE_ITEMS } from "@/constants/pds-questionnaire";
import type { Json } from "@/types/database";
import type { PdsQuestionCode, PdsStepNineValues } from "../../schema";

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

export function createStepNineDefaults(draftData: Json): PdsStepNineValues {
  const steps = asRecord(draftData);
  const step = asRecord(steps["9"] ?? null);
  const existing = Array.isArray(step.questionnaire) ? step.questionnaire : [];
  const byCode = new Map<string, Record<string, Json | undefined>>();
  existing.forEach((value) => {
    const row = asRecord(value);
    byCode.set(asString(row.question_code), row);
  });

  return {
    questionnaire: PDS_QUESTIONNAIRE_ITEMS.map(({ code }) => {
      const row = byCode.get(code) ?? {};
      return {
        question_code: code as PdsQuestionCode,
        answer: typeof row.answer === "boolean" ? row.answer : null,
        details: asString(row.details),
        country: asString(row.country) || (code === "39" ? asString(row.details) : ""),
        date_filed: asDate(row.date_filed),
        case_status: asString(row.case_status),
        id_no: asString(row.id_no),
      };
    }),
  };
}
