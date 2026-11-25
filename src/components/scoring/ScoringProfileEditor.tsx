"use client";

import { useState } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type Resolver,
} from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Modal } from "antd";
import { FormInput, FormSelect } from "@/components/form";
import { Button } from "@/components/ui/Button";
import type { EducationLevel, ScoringRule } from "@/types/scoring";
import {
  isAutomaticCriterion,
  levelDescription,
  previewScore,
} from "@/utils/scoring";
import {
  scoringFormSchema,
  scoringPublicationError,
  type ScoringFormValues,
} from "@/utils/scoring-schema";

function RuleFields({
  control,
  index,
  educationLevels,
}: {
  control: Control<ScoringFormValues>;
  index: number;
  educationLevels: EducationLevel[];
}) {
  const rule = useWatch({ control, name: `rules.${index}` });
  const { fields, append, remove } = useFieldArray({
    control,
    name: `rules.${index}.bands`,
  });
  const automatic = isAutomaticCriterion(rule.criterion_key);
  const numericRule = {
    ...rule,
    points: Number(rule.points),
    minimum_level:
      rule.minimum_level === null || String(rule.minimum_level) === ""
        ? null
        : Number(rule.minimum_level),
    bands: rule.bands.map((band) => ({
      threshold: Number(band.threshold),
      points: Number(band.points),
    })),
  };

  return (
    <section className="space-y-3 rounded-xl border border-line p-4">
      <h3 className="font-semibold text-ink">{rule.title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          control={control}
          label="Maximum points"
          max={100}
          min={0}
          name={`rules.${index}.points`}
          required
          step="0.01"
          type="number"
        />
        {automatic && (
          <FormSelect
            allowClear
            control={control}
            label={`Minimum ${rule.title} level`}
            name={`rules.${index}.minimum_level`}
            options={Array.from({ length: 31 }, (_, i) => ({
              value: i + 1,
              label: `Level ${i + 1} · ${
                rule.criterion_key === "EDUCATION"
                  ? (educationLevels.find(
                      (education) => education.qualification_level === i + 1,
                    )?.description ?? "Education")
                  : levelDescription(rule.criterion_key, i + 1)
              }`,
            }))}
          />
        )}
      </div>

      {automatic && (
        <>
          <details className="rounded-md border border-line-subtle px-3">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-medium text-primary">
              <span>{rule.title} comparison bands</span>
              <span className="text-xs font-normal text-muted">
                {fields.length} {fields.length === 1 ? "band" : "bands"}
              </span>
            </summary>
            <div className="space-y-3 pb-3">
              {fields.map((field, bandIndex) => (
                <div
                  className="grid grid-cols-[1fr_1fr_auto] items-end gap-3"
                  key={field.id}
                >
                  <FormInput
                    control={control}
                    label="Applicant level threshold"
                    max={61}
                    min={0}
                    name={`rules.${index}.bands.${bandIndex}.threshold`}
                    required
                    step={1}
                    type="number"
                  />
                  <FormInput
                    control={control}
                    label="Awarded points"
                    max={100}
                    min={0}
                    name={`rules.${index}.bands.${bandIndex}.points`}
                    required
                    step="0.01"
                    type="number"
                  />
                  <Button
                    aria-label={`Remove ${rule.title} band ${bandIndex + 1}`}
                    disabled={bandIndex === 0}
                    onClick={() => remove(bandIndex)}
                    variant="bordered"
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                disabled={
                  fields.length >= 32 ||
                  Number(rule.bands.at(-1)?.threshold ?? 0) >= 31
                }
                onClick={() =>
                  append({
                    threshold: Math.min(
                      31,
                      Number(rule.bands.at(-1)?.threshold ?? 0) + 2,
                    ),
                    points: Number(rule.bands.at(-1)?.points ?? 0),
                  })
                }
                variant="bordered"
              >
                Add band
              </Button>
              <details>
                <summary className="cursor-pointer text-sm font-medium text-primary">
                  Preview all applicant levels
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  {Array.from({ length: 31 }, (_, i) => (
                    <span key={i}>
                      Level {i + 1}:{" "}
                      {previewScore(numericRule, i + 1) ?? "Not scored"} /{" "}
                      {numericRule.points}
                    </span>
                  ))}
                </div>
              </details>
            </div>
          </details>
        </>
      )}
    </section>
  );
}

export function ScoringProfileEditor({
  title,
  rules,
  educationLevels = [],
  onSave,
  requireComplete = false,
  disabled = false,
  label = "Edit scoring rules",
}: {
  title: string;
  rules: ScoringRule[];
  educationLevels?: EducationLevel[];
  requireComplete?: boolean;
  disabled?: boolean;
  label?: string;
  onSave: (rules: ScoringRule[]) => Promise<{
    success: boolean;
    message: string;
  }>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ScoringFormValues>({
    resolver: yupResolver(scoringFormSchema) as Resolver<ScoringFormValues>,
    defaultValues: { rules },
  });
  const watched = useWatch({ control: form.control, name: "rules" });
  const total = watched.reduce(
    (sum, rule) => sum + (Number(rule.points) || 0),
    0,
  );

  return (
    <>
      <Button
        disabled={disabled}
        onClick={() => {
          form.reset({ rules });
          setError(null);
          setOpen(true);
        }}
        variant="bordered"
      >
        {label}
      </Button>
      <Modal
        destroyOnHidden
        footer={null}
        onCancel={() => {
          if (!form.formState.isSubmitting) setOpen(false);
        }}
        open={open}
        title={title}
        className="pb-10!"
        width={850}
      >
        <form
          className="space-y-5"
          onSubmit={form.handleSubmit(
            async (values) => {
              setError(null);
              const issue = requireComplete
                ? scoringPublicationError(values.rules)
                : null;
              if (issue) {
                setError(issue);
                return;
              }
              try {
                const result = await onSave(values.rules);
                if (result.success) setOpen(false);
                else setError(result.message);
              } catch {
                setError("Scoring rules could not be saved. Try again.");
              }
            },
            () =>
              setError(
                "Check the scoring rules: use ascending bands, points within each maximum, and a total of 100.",
              ),
          )}
        >
          <p aria-live="polite" className="font-semibold text-ink">
            {total.toFixed(2)} / 100 maximum points
          </p>
          {rules.map((rule, index) => (
            <RuleFields
              control={form.control}
              educationLevels={educationLevels}
              index={index}
              key={rule.criterion_id}
            />
          ))}
          {error && <Alert message={error} type="error" />}
          <div className="flex justify-end gap-3">
            <Button
              disabled={form.formState.isSubmitting}
              onClick={() => setOpen(false)}
              variant="bordered"
            >
              Cancel
            </Button>
            <Button
              loading={form.formState.isSubmitting}
              type="submit"
              variant="filled"
            >
              Save scoring rules
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
