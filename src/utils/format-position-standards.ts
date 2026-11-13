export function formatTrainingStandard(level: number | null) {
  if (level === null) return "Not set";
  const lowerHours = (level - 1) * 8;
  return level === 31 ? "240+ hrs" : `${lowerHours}–<${lowerHours + 8} hrs`;
}

export function formatExperienceStandard(level: number | null) {
  if (level === null) return "Not set";
  if (level === 31) return "15+ yrs";
  if (level === 1) return "<6 mos";

  const lowerMonths = (level - 1) * 6;
  const upperMonths = lowerMonths + 6;
  const formatMonths = (months: number) => {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return `${years ? `${years} yr${years === 1 ? "" : "s"}` : ""}${remainingMonths ? ` ${remainingMonths} mos` : ""}`.trim();
  };

  return `${formatMonths(lowerMonths)}–<${formatMonths(upperMonths)}`;
}
