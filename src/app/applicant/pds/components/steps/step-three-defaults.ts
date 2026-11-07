import type { Json } from "@/types/database";
import type { PdsStepThreeValues } from "../../schema";

function asRecord(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function asString(value: Json | undefined) {
  return typeof value === "string" ? value : "";
}

function asYear(value: Json | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const year = Number(value);
    return Number.isInteger(year) ? year : null;
  }
  return null;
}

export function createStepThreeDefaults(draftData: Json): PdsStepThreeValues {
  const steps = asRecord(draftData);
  const step = asRecord(steps["3"] ?? null);
  const rows = Array.isArray(step.education) ? step.education : [];

  return {
    education: rows.map((value) => {
      const row = asRecord(value);
      return {
        level: asString(row.level) as PdsStepThreeValues["education"][number]["level"],
        school_name: asString(row.school_name),
        degree_course: asString(row.degree_course),
        period_from: asYear(row.period_from),
        period_to: asYear(row.period_to),
        highest_level_units_earned: asString(row.highest_level_units_earned),
        year_graduated: asYear(row.year_graduated),
        honors_received: asString(row.honors_received),
      };
    }),
  };
}
