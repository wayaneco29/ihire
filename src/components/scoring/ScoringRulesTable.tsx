"use client";

import type { EducationLevel, ScoringRule } from "@/types/scoring";
import { isAutomaticCriterion, levelDescription } from "@/utils/scoring";

export function ScoringRulesTable({
  rules,
  educationLevels = [],
}: {
  rules: ScoringRule[];
  educationLevels?: EducationLevel[];
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-line p-4">
        <h3 className="font-semibold text-ink">Maximum points by criterion</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Maximum points for each criterion</caption>
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="p-2" scope="col">Criterion</th>
                <th className="p-2 text-right" scope="col">Maximum points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {rules.map((rule) => (
                <tr key={rule.criterion_id}>
                  <th className="p-2 font-medium" scope="row">{rule.title}</th>
                  <td className="p-2 text-right">{rule.points}</td>
                </tr>
              ))}
              <tr>
                <th className="p-2" scope="row">Total</th>
                <td className="p-2 text-right font-semibold">
                  {rules.reduce((total, rule) => total + rule.points, 0).toFixed(2)} / 100
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      {rules
        .filter((rule) => isAutomaticCriterion(rule.criterion_key))
        .map((rule) => (
          <section className="rounded-xl border border-line p-4" key={rule.criterion_id}>
            <h3 className="font-semibold text-ink">
              {rule.title} - {rule.points} maximum points
            </h3>
            <p className="mt-1 text-sm text-muted">
              Minimum: {rule.minimum_level === null
                ? "Not configured"
                : `${
                    rule.criterion_key === "EDUCATION"
                      ? educationLevels.find(
                          (level) => level.qualification_level === rule.minimum_level,
                        )?.description ?? "Education qualification"
                      : levelDescription(rule.criterion_key, rule.minimum_level)
                  } (level ${rule.minimum_level})`}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">{rule.title} comparison bands</caption>
                <thead className="border-b border-line text-muted">
                  <tr>
                    <th className="p-2" scope="col">Applicant level threshold</th>
                    <th className="p-2" scope="col">Applicable applicant levels</th>
                    <th className="p-2" scope="col">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  <tr>
                    <td className="p-2">-</td>
                    <td className="p-2">
                      {rule.minimum_level === null
                        ? "Below minimum"
                        : `Below level ${rule.minimum_level}`}
                    </td>
                    <td className="p-2">0</td>
                  </tr>
                  {rule.bands.map((band) => {
                    const nextThreshold = rule.bands[index + 1]?.threshold;
                    const startLevel = Math.max(band.threshold, rule.minimum_level ?? 1);
                    const endLevel = Math.min(
                      31,
                      nextThreshold === undefined ? 31 : nextThreshold - 1,
                    );
                    const levelRange = rule.minimum_level === null
                      ? "-"
                      : startLevel > endLevel
                        ? "No eligible level"
                        : startLevel === endLevel
                          ? `Level ${startLevel}`
                          : `Levels ${startLevel}-${endLevel}`;

                    return (
                      <tr key={band.threshold}>
                        <td className="p-2">{band.threshold}</td>
                        <td className="p-2">{levelRange}</td>
                        <td className="p-2 font-semibold">{band.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
    </div>
  );
}

export function QualificationReference({
  educationLevels,
}: {
  educationLevels: EducationLevel[];
}) {
  return (
    <details open className="rounded-xl border border-line p-4">
      <summary className="cursor-pointer font-semibold text-ink">
        Education, training, and experience level reference
      </summary>
      <p className="mt-3 text-sm leading-6 text-muted">
        Education uses your highest PDS qualification. Training level advances
        once per 8 hours. Experience level advances once per 6 months. Levels
        are capped at 31. The minimum level is checked separately from scoring
        bands. Experience currently counts government-service work titled
        teacher, instructor, or educator; overlapping periods count once.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Qualification levels 1 through 31</caption>
          <thead>
            <tr>
              {["Level", "Education", "Training", "Experience"].map((label) => (
                <th className="p-2" scope="col" key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-subtle">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((level) => (
              <tr key={level}>
                <th className="p-2" scope="row">{level}</th>
                <td className="p-2">
                  {educationLevels.find((entry) => entry.qualification_level === level)
                    ?.description ?? `Qualification level ${level}`}
                </td>
                <td className="whitespace-nowrap p-2">
                  {levelDescription("TRAINING", level)}
                </td>
                <td className="whitespace-nowrap p-2">
                  {levelDescription("EXPERIENCE", level)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
