import type { Json } from "@/types/database";
import type { PdsStepEightValues } from "../../schema";

function asRecord(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function asString(value: Json | undefined) {
  return typeof value === "string" ? value : "";
}

export function createStepEightDefaults(draftData: Json): PdsStepEightValues {
  const steps = asRecord(draftData);
  const step = asRecord(steps["8"] ?? null);
  const rows = Array.isArray(step.otherInfo) ? step.otherInfo : [];

  return {
    otherInfo: rows.flatMap((value) => {
      const row = asRecord(value);
      const category = asString(row.category) as PdsStepEightValues["otherInfo"][number]["category"];
      const description = asString(row.description);
      if (!category && !description) return [];
      return [{ category, description }];
    }),
  };
}
