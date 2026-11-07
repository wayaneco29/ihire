import dayjs from "dayjs";
import type { Json } from "@/types/database";
import type { PdsStepSixValues } from "../../schema";

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

export function createStepSixDefaults(draftData: Json): PdsStepSixValues {
  const steps = asRecord(draftData);
  const step = asRecord(steps["6"] ?? null);
  const rows = Array.isArray(step.voluntaryWork) ? step.voluntaryWork : [];

  return {
    voluntaryWork: rows.flatMap((value) => {
      const row = asRecord(value);
      const organization = asString(row.organization_name_address);
      const from = asDate(row.date_from);
      const to = asDate(row.date_to);
      const hours = asNumber(row.hours);
      const position = asString(row.position_nature);
      if (!organization && !from && !to && hours === null && !position) return [];
      return [
        {
          organization_name_address: organization,
          date_from: from,
          date_to: to,
          hours,
          position_nature: position,
        },
      ];
    }),
  };
}
