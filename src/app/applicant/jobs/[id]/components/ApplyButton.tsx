"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button } from "antd";
import { useForm, useWatch } from "react-hook-form";
import { FormSelect } from "@/components/form";
import { calculateTrainingPoints } from "@/utils/calculate-training-points";
import { formatPositionLabel } from "@/utils/format-position-track";
import { applyToJob } from "../../actions";
import { applicationSchema, type ApplicationValues } from "../../schema";

type PositionOption = {
  id: string;
  title: string;
  application_type: { name: string } | null;
  criteria: Array<{
    id: string;
    key: string;
    title: string;
    points: number;
    displayOrder: number;
  }>;
};

export function ApplyButton({
  jobId,
  positions,
  trainingHours,
}: {
  jobId: string;
  positions: PositionOption[];
  trainingHours: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ApplicationValues>({
    resolver: yupResolver(applicationSchema),
    defaultValues: { positionId: "" },
  });
  const selectedPositionId = useWatch({
    control: form.control,
    name: "positionId",
  });
  const selectedPosition = positions.find(
    (position) => position.id === selectedPositionId,
  );
  const trainingCriterion = selectedPosition?.criteria.find(
    (criterion) => criterion.key === "TRAINING",
  );
  const estimatedTrainingPoints = trainingCriterion
    ? calculateTrainingPoints(trainingHours, trainingCriterion.points)
    : null;

  async function submit(values: ApplicationValues) {
    setError(null);
    const result = await applyToJob(jobId, values.positionId);

    if (!result.success) {
      setError(result.message);
      return;
    }
    router.push(`/applicant/applications/${result.applicationId}`);
    router.refresh();
  }

  return (
    <form
      className="w-full space-y-3 sm:max-w-sm"
      onSubmit={form.handleSubmit(submit)}
    >
      <FormSelect
        control={form.control}
        hint="Choose the position you want to be considered for."
        label="Position applying for"
        name="positionId"
        options={positions.map((position) => ({
          label: formatPositionLabel(
            position.title,
            position.application_type?.name ?? "",
          ),
          value: position.id,
        }))}
        placeholder="Select a position"
        required
      />
      {selectedPosition && (
        <section
          aria-live="polite"
          className="rounded-xl border border-line-subtle bg-panel-muted p-4"
        >
          <h2 className="text-sm font-semibold text-ink">
            Maximum points / Your points
          </h2>
          <ul className="mt-3 divide-y divide-line-subtle">
            {selectedPosition.criteria.map((criterion) => (
              <li
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-sm"
                key={criterion.id}
              >
                <span className="font-medium text-ink">{criterion.title}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 font-semibold tabular-nums text-primary">
                  <span>
                    {criterion.key === "TRAINING" &&
                    estimatedTrainingPoints !== null
                      ? estimatedTrainingPoints.toFixed(2)
                      : "—"}
                  </span>
                  <span aria-hidden="true" className="text-primary/60">
                    /
                  </span>
                  <span>{criterion.points}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {error && <Alert message={error} showIcon type="error" />}
      <Button
        className="min-h-11 w-full sm:w-auto"
        htmlType="submit"
        loading={form.formState.isSubmitting}
        type="primary"
      >
        Submit application
      </Button>
    </form>
  );
}
