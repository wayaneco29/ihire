import type { ScoringBand, ScoringRule } from "@/types/scoring";

export const AUTOMATIC_CRITERIA = ["EDUCATION", "TRAINING", "EXPERIENCE"];
export function isAutomaticCriterion(key: string) { return AUTOMATIC_CRITERIA.includes(key); }

export function readBands(value: unknown): ScoringBand[] {
  if (!Array.isArray(value)) return [];
  return value.filter((band): band is ScoringBand => band !== null &&
    typeof band === "object" && typeof band.threshold === "number" && typeof band.points === "number")
    .sort((a, b) => a.threshold - b.threshold);
}

/** Preview only. Application ratings are calculated from trusted records in Postgres. */
export function previewScore(rule: ScoringRule, level: number | null): number | null {
  if (rule.points === 0) return 0;
  if (level === null || rule.minimum_level === null || !rule.bands.length) return null;
  if (level < rule.minimum_level) return 0;
  return [...rule.bands].sort((a, b) => b.threshold - a.threshold)
    .find((band) => band.threshold <= level - rule.minimum_level!)?.points ?? null;
}

export function bandRange(bands: ScoringBand[], index: number): string {
  const start = bands[index].threshold;
  const next = bands[index + 1]?.threshold;
  return next === undefined ? `${start} or more` : next === start + 1 ? `${start}` : `${start}–${next - 1}`;
}

export function levelDescription(key: string, level: number): string {
  if (key === "TRAINING") return `${(level - 1) * 8}${level === 31 ? "+" : ` to <${level * 8}`} hours`;
  if (key === "EXPERIENCE") return `${(level - 1) * 6}${level === 31 ? "+" : ` to <${level * 6}`} months`;
  return `Qualification level ${level}`;
}
