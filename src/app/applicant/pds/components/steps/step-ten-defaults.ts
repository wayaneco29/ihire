import type { Json } from "@/types/database";
import type { PdsStepTenValues } from "../../schema";

function asRecord(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function asString(value: Json | undefined) {
  return typeof value === "string" ? value : "";
}

export function createStepTenDefaults(draftData: Json): PdsStepTenValues {
  const steps = asRecord(draftData);
  const step = asRecord(steps["10"] ?? null);
  const values = Array.isArray(step.references) ? step.references : [];
  const references = [0, 1, 2].map((index) => {
    const row = asRecord(values[index] ?? null);
    return {
      name: asString(row.name),
      address: asString(row.address),
      contact: asString(row.contact),
    };
  });

  return {
    references,
    confirm_unrelated: step.confirm_unrelated === true,
  };
}
