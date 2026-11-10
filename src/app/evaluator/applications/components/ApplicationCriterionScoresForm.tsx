"use client";

import { useMemo, useState, useTransition } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FormInput } from "@/components/form/FormInput";
import { submitApplicationCriterionScores } from "../actions";
import {
  applicationCriterionScoresSchema,
  type ApplicationCriterionScoresValues,
  type ManualScoringCriterion,
} from "../schema";

export function ApplicationCriterionScoresForm({
  applicationId,
  applicationStatus,
  criteria,
  existingScores,
  scoresUnavailable,
}: {
  applicationId: string;
  applicationStatus: string;
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
  });
  const isFinal =
    applicationStatus === "HIRED" || applicationStatus === "REJECTED";

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
      if (result.success) router.refresh();
    });
  }

  return (
    <section className="mt-5 rounded-sm border border-line bg-panel p-5 sm:p-6">
      <div>
        <h2 className="font-semibold text-ink">Demo teaching points</h2>
        <p className="mt-1 text-sm text-muted">
          Enter the points awarded for the demo teaching observation. The score
          cannot exceed the maximum configured for this position.
        </p>
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
          <div className="grid gap-x-4 sm:grid-cols-2">
            {criteria.map((criterion, index) => (
              <FormInput
                control={form.control}
                hint={`Maximum ${criterion.maxPoints} points.`}
                key={criterion.id}
                label={criterion.title}
                max={criterion.maxPoints}
                min={0}
                name={`scores.${index}.points`}
                required
                step="0.01"
                type="number"
              />
            ))}
          </div>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending || isFinal}
            type="submit"
          >
            {pending ? "Saving points…" : "Save points"}
          </button>
          {isFinal && (
            <p className="text-sm text-muted">
              This application has a final hiring decision and can no longer be
              scored.
            </p>
          )}
          {message && (
            <p
              className={`text-sm ${message === "Criterion scores saved." ? "text-primary" : "text-danger"}`}
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
