"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert } from "antd";
import { useForm, useWatch } from "react-hook-form";
import { FormSelect } from "@/components/form";
import { Button } from "@/components/ui/Button";
import { formatExperienceMonths } from "@/utils/calculate-public-teaching-experience";
import { formatPositionLabel } from "@/utils/format-position-track";
import { applyToJob } from "../../actions";
import { applicationSchema, type ApplicationValues } from "../../schema";

type PositionOption = {
  id: string;
  title: string;
  application_type: { name: string } | null;
  educationPoints: number | null;
  trainingPoints: number | null;
  experiencePoints: number | null;
  qualifyingExperienceMonths: number;
  experienceIncrementLevel: number;
  base_experience_increment_level: number | null;
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
}: {
  jobId: string;
  positions: PositionOption[];
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
          <p className="mt-1 text-xs leading-5 text-muted">
            Education level differences map to equivalent points using the
            configured Education weight. Training hours map to 8-hour
            increments, then use the position’s minimum Training level and
            configured weight. Public teaching experience uses government
            service entries with teaching-related titles, merged to avoid
            double-counting overlaps. Differences below 2 earn 0 points.
          </p>
          <ul className="mt-3 divide-y divide-line-subtle">
            {selectedPosition.criteria.map((criterion) => (
              <li
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-sm"
                key={criterion.id}
              >
                <span className="font-medium text-ink">{criterion.title}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 font-semibold tabular-nums text-primary">
                  <span>
                    {criterion.key === "EDUCATION" &&
                    selectedPosition.educationPoints !== null
                      ? selectedPosition.educationPoints.toFixed(2)
                      : criterion.key === "TRAINING" &&
                        selectedPosition.trainingPoints !== null
                        ? selectedPosition.trainingPoints.toFixed(2)
                        : criterion.key === "EXPERIENCE" &&
                            selectedPosition.experiencePoints !== null
                          ? selectedPosition.experiencePoints.toFixed(2)
                        : "—"}
                  </span>
                  <span aria-hidden="true" className="text-primary/60">
                    /
                  </span>
                  <span>{criterion.points}</span>
                </span>
                {criterion.key === "EXPERIENCE" && (
                  <p className="basis-full text-xs leading-5 text-muted">
                    {formatExperienceMonths(
                      selectedPosition.qualifyingExperienceMonths,
                    )}{" "}
                    qualifying public teaching experience (Level{" "}
                    {selectedPosition.experienceIncrementLevel}
                    {selectedPosition.base_experience_increment_level === null
                      ? "; position minimum not set"
                      : `; minimum Level ${selectedPosition.base_experience_increment_level}`}
                    ).
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {error && <Alert message={error} showIcon type="error" />}
      <Button
        className="w-full sm:w-auto"
        type="submit"
        loading={form.formState.isSubmitting}
        variant="filled"
      >
        Submit application
      </Button>
    </form>
  );
}
