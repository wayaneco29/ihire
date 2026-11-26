import * as yup from "yup";
import { AUTOMATIC_CRITERIA, isAutomaticCriterion } from "./scoring";
import type { ScoringRule } from "@/types/scoring";

export function automaticBandsError(rules: ScoringRule[]): string | null {
  for (const key of AUTOMATIC_CRITERIA) {
    const rule = rules.find((item) => item.criterion_key === key);
    if (!rule || !Array.isArray(rule.bands) || rule.bands.length === 0) {
      const title = rule?.title ?? key.charAt(0) + key.slice(1).toLowerCase();
      return `${title}: add at least one comparison band before saving.`;
    }
  }
  return null;
}

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
  .test("automatic-bands", function (rules) {
    if (!Array.isArray(rules)) return true;
    const message = automaticBandsError(rules);
    return message ? this.createError({ message }) : true;
  })
  .test("total", "All criteria must total exactly 100 points.", (rules) => !Array.isArray(rules) || Math.round(rules.reduce((sum, rule) => sum + rule.points, 0) * 100) === 10000)
  .test("unique", "Each criterion must appear once.", (rules) => !Array.isArray(rules) || new Set(rules.map((rule) => rule.criterion_id)).size === rules.length);
export const scoringFormSchema = yup.object({ rules: scoringRulesSchema });
export type ScoringFormValues = yup.InferType<typeof scoringFormSchema>;

export function scoringPublicationError(rules: ScoringFormValues["rules"]): string | null {
  const bandError = automaticBandsError(rules);
  if (bandError) return bandError;
  for (const rule of rules) {
    if (!isAutomaticCriterion(rule.criterion_key) || rule.points === 0) continue;
    if (rule.minimum_level === null) return `${rule.title}: set a minimum qualification level.`;
    if (!rule.bands.some((band) => band.points === rule.points && band.threshold <= 31))
      return `${rule.title}: award the full ${rule.points} points at a reachable applicant level (31 or lower).`;
  }
  return null;
}
