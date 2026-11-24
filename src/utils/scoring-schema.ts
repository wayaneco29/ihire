import * as yup from "yup";
import { isAutomaticCriterion } from "./scoring";

const points = yup.number().typeError("Enter a number.").min(0).max(100)
  .test("precision", "Use up to two decimal places.", (value) => value == null || Math.abs(value * 100 - Math.round(value * 100)) < 1e-8).required();
export const scoringRuleSchema = yup.object({
  criterion_id: yup.string().uuid().required(),
  criterion_key: yup.string().required(),
  title: yup.string().required(),
  points,
  minimum_level: yup.number().transform((value, original) => original === "" ? null : value).nullable().integer().min(1).max(31).default(null),
  bands: yup.array().of(yup.object({
    threshold: yup.number().typeError("Enter a whole number.").integer().min(0).max(61).required(),
    points,
  })).max(32).required(),
}).test("bands", "Use ascending, unique thresholds starting at 0 and nondecreasing points within the maximum.", (rule) => {
  if (!rule || !Array.isArray(rule.bands) || !isAutomaticCriterion(rule.criterion_key)) return true;
  return rule.bands.length > 0 && rule.bands[0].threshold === 0 && rule.bands.every((band, i) =>
    band.points <= rule.points && (!i || (band.threshold > rule.bands[i - 1].threshold && band.points >= rule.bands[i - 1].points)));
});
export const scoringRulesSchema = yup.array().of(scoringRuleSchema).min(1).required()
  .test("total", "All criteria must total exactly 100 points.", (rules) => !Array.isArray(rules) || Math.round(rules.reduce((sum, rule) => sum + rule.points, 0) * 100) === 10000)
  .test("unique", "Each criterion must appear once.", (rules) => !Array.isArray(rules) || new Set(rules.map((rule) => rule.criterion_id)).size === rules.length);
export const scoringFormSchema = yup.object({ rules: scoringRulesSchema });
export type ScoringFormValues = yup.InferType<typeof scoringFormSchema>;

export function scoringPublicationError(rules: ScoringFormValues["rules"]): string | null {
  for (const rule of rules) {
    if (!isAutomaticCriterion(rule.criterion_key) || rule.points === 0) continue;
    if (rule.minimum_level === null) return `${rule.title}: set a minimum qualification level.`;
    if (!rule.bands.some((band) => band.points === rule.points && band.threshold <= 31))
      return `${rule.title}: award the full ${rule.points} points at a reachable applicant level (31 or lower).`;
  }
  return null;
}
