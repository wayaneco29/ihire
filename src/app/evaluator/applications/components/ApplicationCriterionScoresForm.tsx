"use client";

import { useMemo, useState, useTransition } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FormInput } from "@/components/form/FormInput";
import { Button } from "@/components/ui/Button";
import { submitApplicationCriterionScores } from "../actions";
import {
  applicationCriterionScoresSchema,
  type ApplicationCriterionScoresValues,
  type ManualScoringCriterion,
} from "../schema";

export function ApplicationCriterionScoresForm({
  applicationId,
  applicationStatus,
  returnHref,
  criteria,
  existingScores,
  scoresUnavailable,
}: {
  applicationId: string;
  applicationStatus: string;
  returnHref: string;
  criteria: ManualScoringCriterion[];
  existingScores: Record<string, number | null>;
  scoresUnavailable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const schema = useMemo(
    () => applicationCriterionScoresSchema(criteria),
    [criteria],
  );
  const defaultValues = useMemo(
    () => ({
      scores: criteria.map((criterion) => ({
        criterionId: criterion.id,
        points: existingScores[criterion.id] ?? null,
      })),
    }),
    [criteria, existingScores],
  );
  const form = useForm<ApplicationCriterionScoresValues>({
    resolver: yupResolver(schema),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });
  const isFinal = [
    "ASSESSMENT_SCORED",
    "QUALIFIED",
    "NOT_QUALIFIED",
    "HIRED",
    "NOT_SELECTED",
    "REJECTED",
  ].includes(applicationStatus);

  function submit(values: ApplicationCriterionScoresValues) {
    setMessage(null);
    startTransition(async () => {
      const result = await submitApplicationCriterionScores({
        applicationId,
        scores: values.scores.map((score) => ({
          criterionId: score.criterionId,
          points: score.points,
        })),
      });
      setMessage(result.message);
      if (result.success) router.replace(returnHref);
    });
  }

  return (
    <section
      aria-labelledby="assessment-points-title"
      className="rounded-sm border border-line bg-panel p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            className="text-lg font-semibold text-ink"
            id="assessment-points-title"
          >
            Award points
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Record points for each configured criterion using the
            position&apos;s scoring limits.
          </p>
        </div>
        {criteria.length > 0 && (
          <span className="rounded-sm bg-primary-light px-3 py-2 text-xs font-semibold text-primary">
            {criteria.reduce(
              (total, criterion) => total + criterion.maxPoints,
              0,
            )}{" "}
            points available
          </span>
        )}
      </div>
      {scoresUnavailable ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          Scoring criteria or saved points could not be loaded. Refresh and try
          again.
        </p>
      ) : !criteria.length ? (
        <p className="mt-4 text-sm text-muted">
          Manual criteria are not configured for this application.
        </p>
      ) : (
        <form
          className="mt-5 space-y-4 border-t border-line-subtle pt-5"
          onSubmit={form.handleSubmit(submit)}
        >
          <div className="space-y-3">
            {criteria.map((criterion, index) => (
              <div
                className="rounded-sm border border-line-subtle bg-panel-muted p-4 sm:p-5"
                key={criterion.id}
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-primary">
                      Criterion {index + 1}
                    </p>
                    <h3 className="mt-1 font-semibold text-ink">
                      {criterion.title}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {criterion.criterionKey === "PERFORMANCE"
                        ? "Score the applicant's performance using the configured position criteria."
                        : criterion.criterionKey === "TEACHER_REFLECTION"
                          ? "Score the teaching reflection form."
                          : criterion.criterionKey === "CLASSROOM_OBSERVATION"
                            ? "Score the applicant's demo teaching presentation."
                            : `Score the applicant for ${criterion.title.toLowerCase()} using the configured position criteria.`}
                    </p>
                  </div>
                  <span className="rounded-sm border border-line bg-panel px-2.5 py-1.5 text-xs font-semibold tabular-nums text-ink">
                    Max {criterion.maxPoints}
                  </span>
                </div>
                <FormInput
                  control={form.control}
                  hint={
                    existingScores[criterion.id] != null
                      ? `Previously saved: ${existingScores[criterion.id]} points.`
                      : `Enter up to ${criterion.maxPoints} points.`
                  }
                  label="Points awarded"
                  max={criterion.maxPoints}
                  min={0}
                  name={`scores.${index}.points`}
                  required
                  step="0.01"
                  type="number"
                />
              </div>
            ))}
          </div>
          {!isFinal && (
            <div className="border-t border-line-subtle pt-4">
              <Button
                disabled={pending || isFinal}
                type="submit"
                variant="filled"
              >
                {pending ? "Saving points…" : "Submit assessment points"}
              </Button>
            </div>
          )}
          {isFinal && (
            <p className="text-sm text-muted">
              Assessment points have already been submitted or a decision has
              been recorded.
            </p>
          )}
          {message && (
            <p
              className={`text-sm ${
                message.startsWith("Assessment scores saved.") ||
                message === "Criterion scores saved."
                  ? "text-primary"
                  : "text-danger"
              }`}
              role="status"
            >
              {message}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
