export const JOB_REQUIREMENTS_BUCKET = "job-posting-requirements";

export function getJobRequirementsPdfPath(jobId: string) {
  return jobId + "/requirements.pdf";
}

function cleanRequirement(item: string) {
  return item
    .replace(/^\s*(?:[-*]|\d+[.)]|\u2022|\u2012|\u2013|\u2014)\s*/, "")
    .trim();
}

function parseRequirementArray(value: string): string[] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;

    return parsed
      .filter((item): item is string => typeof item === "string")
      .map(cleanRequirement)
      .filter(Boolean);
  } catch {
    return null;
  }
}

export function parseLegacyRequirements(value: string | null | undefined) {
  const text = value?.trim();
  if (!text) return [];

  const parsed = parseRequirementArray(text);
  if (parsed) return parsed;

  return text
    .split(/\r?\n/)
    .map(cleanRequirement)
    .filter(Boolean);
}

export function getJobRequirements(
  items: unknown,
  legacyText: string | null | undefined,
) {
  if (typeof items === "string") {
    const parsedItems = parseLegacyRequirements(items);
    if (parsedItems.length) return parsedItems;
  }

  if (Array.isArray(items)) {
    const normalized = items
      .filter((item): item is string => typeof item === "string")
      .flatMap((item) => parseRequirementArray(item.trim()) ?? [item])
      .map(cleanRequirement)
      .filter(Boolean);
    if (normalized.length) return normalized;
  }

  return parseLegacyRequirements(legacyText);
}

export function serializeRequirements(items: string[]) {
  return JSON.stringify(items.map((item) => item.trim()).filter(Boolean));
}

