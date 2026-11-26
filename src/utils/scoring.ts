import type { ScoringBand, ScoringRule } from "@/types/scoring";

export const AUTOMATIC_CRITERIA = ["EDUCATION", "TRAINING", "EXPERIENCE"];
export function isAutomaticCriterion(key: string) { return AUTOMATIC_CRITERIA.includes(key); }

export function readBands(value: unknown): ScoringBand[] {
  if (!Array.isArray(value)) return [];
  return value.filter((band): band is ScoringBand => band !== null &&
    typeof band === "object" && typeof band.threshold === "number" && typeof band.points === "number")
    .sort((a, b) => a.threshold - b.threshold);
}

export function nextScoringBands(
  bands: ScoringBand[],
  maximumPoints: number,
): ScoringBand[] | null {
  if (!Number.isFinite(maximumPoints) || maximumPoints <= 0) return null;

  const lastBand = bands.at(-1);
  if (!lastBand) return [{ threshold: 0, points: 0 }];

  const maximumThreshold = Math.min(31, Math.ceil(maximumPoints));
  if (
    lastBand.threshold >= maximumThreshold ||
    lastBand.points >= maximumPoints
  ) {
    return null;
  }

  const nextPoints = lastBand.points + 2;
  // Fold a short final remainder into the preceding award and skip the
  // intermediate band: for 15 points, 12:12 becomes 12:13 followed by 15:15.
  if (nextPoints < maximumPoints && nextPoints + 2 > maximumPoints) {
    return [
      ...bands.slice(0, -1),
      { ...lastBand, points: Math.round((maximumPoints - 2) * 100) / 100 },
      { threshold: maximumThreshold, points: maximumPoints },
    ];
  }

  return [...bands, {
    threshold: nextPoints >= maximumPoints
      ? maximumThreshold
      : Math.min(maximumThreshold, lastBand.threshold + 2),
    points: Math.min(maximumPoints, nextPoints),
  }];
}

/** Preview only. Application ratings are calculated from trusted records in Postgres. */
export function previewScore(rule: ScoringRule, level: number | null): number | null {
  if (rule.points === 0) return 0;
  if (level === null || rule.minimum_level === null || !rule.bands.length) return null;
  if (level < rule.minimum_level) return 0;
  return [...rule.bands].sort((a, b) => b.threshold - a.threshold)
    .find((band) => band.threshold <= level)?.points ?? null;
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
