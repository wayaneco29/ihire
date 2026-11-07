import dayjs from "dayjs";
import type { Json } from "@/types/database";
import type { PdsStepFourValues } from "../../schema";

function asRecord(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function asString(value: Json | undefined) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: Json | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

function asDate(value: Json | undefined) {
  if (typeof value !== "string" || !value) return null;
  return dayjs(value).isValid() ? dayjs(value) : null;
}

export function createStepFourDefaults(draftData: Json): PdsStepFourValues {
  const steps = asRecord(draftData);
  const step = asRecord(steps["4"] ?? null);
  const rows = Array.isArray(step.eligibility) ? step.eligibility : [];

  return {
    eligibility: rows.flatMap((value) => {
      const row = asRecord(value);
      const eligibilityName = asString(row.eligibility_name);
      const rating = asNumber(row.rating);
      const examDate = asDate(row.exam_date);
      const examPlace = asString(row.exam_place);
      const licenseNo = asString(row.license_no);
      const licenseValidUntil = asDate(row.license_valid_until);
      if (
        !eligibilityName &&
        rating === null &&
        !examDate &&
        !examPlace &&
        !licenseNo &&
        !licenseValidUntil
      ) {
        return [];
      }
      return [
        {
          eligibility_name: eligibilityName,
          rating,
          exam_date: examDate,
          exam_place: examPlace,
          license_no: licenseNo,
          license_valid_until: licenseValidUntil,
        },
      ];
    }),
  };
}
