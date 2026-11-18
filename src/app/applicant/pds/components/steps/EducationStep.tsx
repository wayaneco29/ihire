"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  useForm,
  useFieldArray,
  useWatch,
  type Control,
  type Resolver,
} from "react-hook-form";
import { Button } from "@/components/ui/Button";
import {
  FormCheckbox,
  FormInput,
  FormSelect,
  FormYearPicker,
} from "@/components/form";
import { EDUCATION_LEVEL_OPTIONS } from "@/constants/pds-options";
import type { Json } from "@/types/database";
import { savePdsEducationStep } from "../../actions/steps-one-three";
import { usePdsStepAutosave } from "../../hooks/usePdsStepAutosave";
import { pdsStepThreeSchema, type PdsStepThreeValues } from "../../schema";
import {
  createEmptyEducationRow,
  createStepThreeDefaults,
} from "./step-three-defaults";
import { PdsSectionCard } from "../PdsSectionCard";
import { PdsStepFooter } from "../PdsStepFooter";

type Props = {
  draftData: Json;
  onBack: () => void;
  onCompleted: (nextStep: number, stepData: Json) => void;
  pdsVersionId: string;
};

function EducationFields({
  control,
  index,
  graduateStudies = false,
}: {
  control: Control<PdsStepThreeValues>;
  index: number;
  graduateStudies?: boolean;
}) {
  const degreeCompleted = useWatch({
    control,
    name: `education.${index}.graduate_degree_completed`,
  });

  return (
    <div className="space-y-1">
      {graduateStudies && (
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <FormSelect
            control={control}
            label="Graduate degree type"
            name={`education.${index}.graduate_degree_type`}
            options={[
              { label: "Master's", value: "MASTERS" },
              { label: "Doctorate", value: "DOCTORATE" },
            ]}
            placeholder="Choose degree type"
            required
          />
          <FormCheckbox
            control={control}
            label="I completed this degree"
            name={`education.${index}.graduate_degree_completed`}
            required
          />
          {!degreeCompleted && (
            <FormInput
              control={control}
              hint="Enter the total graduate units earned. Points use the highest completed unit threshold."
              label="Current units earned"
              min={0}
              name={`education.${index}.graduate_units_earned`}
              type="number"
            />
          )}
        </div>
      )}
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <FormInput
          control={control}
          label="Name of school"
          name={`education.${index}.school_name`}
        />
        <FormInput
          control={control}
          label="Degree or course"
          name={`education.${index}.degree_course`}
        />
      </div>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
        <FormYearPicker
          control={control}
          label="Period from (year)"
          maxYear={new Date().getFullYear()}
          minYear={1900}
          name={`education.${index}.period_from`}
        />
        <FormYearPicker
          control={control}
          label="Period to (year)"
          maxYear={new Date().getFullYear()}
          minYear={1900}
          name={`education.${index}.period_to`}
        />
        <GraduationYearField control={control} index={index} />
      </div>
      {!graduateStudies && (
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <FormInput
            control={control}
            label="Highest level or units earned"
            name={`education.${index}.highest_level_units_earned`}
          />
          <FormInput
            control={control}
            label="Scholarship or honors received"
            name={`education.${index}.honors_received`}
          />
        </div>
      )}
      {graduateStudies && (
        <FormInput
          control={control}
          label="Scholarship or honors received"
          name={`education.${index}.honors_received`}
        />
      )}
    </div>
  );
}

function GraduationYearField({
  control,
  index,
}: {
  control: Control<PdsStepThreeValues>;
  index: number;
}) {
  const periodFrom = useWatch({
    control,
    name: `education.${index}.period_from`,
  });

  return (
    <FormYearPicker
      control={control}
      disabled={periodFrom == null}
      hint={
        periodFrom == null
          ? "Enter the period start year first."
          : "Leave blank if you didn’t graduate."
      }
      label="Year graduated"
      maxYear={new Date().getFullYear()}
      minYear={periodFrom ?? 1900}
      name={`education.${index}.year_graduated`}
    />
  );
}

export function EducationStep({
  draftData,
  onBack,
  onCompleted,
  pdsVersionId,
}: Props) {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<PdsStepThreeValues>({
    defaultValues: createStepThreeDefaults(draftData),
    mode: "onBlur",
    resolver: yupResolver(pdsStepThreeSchema) as Resolver<PdsStepThreeValues>,
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "education",
  });
  const fixedEducationOptions = EDUCATION_LEVEL_OPTIONS.filter(
    ({ value }) => value !== "GRADUATE_STUDIES",
  );
  const graduateStudyIndexes = fields
    .map((field, index) => ({ field, index }))
    .filter(({ field }) => field.level === "GRADUATE_STUDIES");
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [openLevel, setOpenLevel] = useState<string | null>("ELEMENTARY");
  const values = useWatch({ control });
  const educationValues = values.education ?? [];
  const autosave = usePdsStepAutosave(
    pdsVersionId,
    3,
    values as unknown as Record<string, unknown>,
  );

  async function submitStep(valuesToSave: PdsStepThreeValues) {
    setSubmitMessage(null);
    const result = await savePdsEducationStep(pdsVersionId, valuesToSave);
    if (!result.success) {
      setSubmitMessage(result.message);
      return;
    }
    onCompleted(
      result.currentStep,
      JSON.parse(JSON.stringify(valuesToSave)) as Json,
    );
  }

  return (
    <form className="space-y-7" onSubmit={handleSubmit(submitStep)}>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Educational background
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Open each level you attended and fill it in. Skip any level you didn’t
          attend, and add one entry for every graduate degree.
        </p>
      </div>

      <div className="space-y-3">
        {fixedEducationOptions.map(({ label, value }, index) => {
          const row = educationValues[index];
          const title = value === "SECONDARY" ? "High school" : label;
          const period =
            row?.period_from != null || row?.period_to != null
              ? `${row.period_from ?? "?"}–${row.period_to ?? "?"}`
              : null;
          const subtitle = [row?.school_name, period]
            .filter(Boolean)
            .join(" · ");
          const hasDetails = Boolean(
            row &&
            (row.school_name ||
              row.degree_course ||
              row.period_from != null ||
              row.period_to != null ||
              row.year_graduated != null ||
              row.highest_level_units_earned ||
              row.honors_received),
          );
          const graduationPeriodMismatch =
            row?.year_graduated != null &&
            row.period_to != null &&
            row.year_graduated !== row.period_to;

          return (
            <PdsSectionCard
              aria-label={`${title} education`}
              contentClassName="border-t border-line-subtle p-4 sm:p-5"
              contentId={`education-${value.toLowerCase()}-content`}
              contentPadding={false}
              header={
                <Button
                  aria-controls={`education-${value.toLowerCase()}-content`}
                  aria-expanded={openLevel === value}
                  className="flex min-h-[4.5rem] w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary active:!transform-none sm:px-5"
                  onClick={() =>
                    setOpenLevel((current) => (current === value ? null : value))
                  }
                  type="button"
                  variant="unstyled"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-primary-dark sm:text-base">
                      {title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted sm:text-sm">
                      {subtitle || "Add school and years attended"}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                        graduationPeriodMismatch
                          ? "border-warning/20 bg-warning/10 text-warning"
                          : "border-line bg-panel-muted text-muted"
                      }`}
                    >
                      {graduationPeriodMismatch
                        ? "Check years"
                        : hasDetails
                          ? "In progress"
                          : "Not started"}
                    </span>
                    <ChevronDownIcon
                      aria-hidden="true"
                      className={`size-4 text-muted transition-transform ${
                        openLevel === value ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                </Button>
              }
              headerClassName="p-0"
              key={value}
            >
              {openLevel === value ? (
                <>
                  <EducationFields control={control} index={index} />
                  {graduationPeriodMismatch && (
                    <p className="mt-1 rounded-md bg-warning/10 px-3 py-2 text-xs leading-5 text-warning">
                      You list graduating in {row.year_graduated}, but your
                      period ends in {row.period_to}. Check both years.
                    </p>
                  )}
                </>
              ) : null}
            </PdsSectionCard>
          );
        })}
      </div>

      <section
        aria-label="Graduate studies"
        className="rounded-lg border border-dashed border-line-strong px-4 py-4 sm:px-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-primary-dark sm:text-base">
              Graduate studies
            </h3>
            <p className="mt-1 text-sm text-muted">
              Add one entry for each master’s or doctoral program.
            </p>
          </div>
          <Button
            type="button"
            disabled={graduateStudyIndexes.length >= 20}
            className="!h-auto !rounded-sm !px-6 !py-2.5 !text-xs"
            onClick={() => append(createEmptyEducationRow("GRADUATE_STUDIES"))}
            variant="bordered"
          >
            Add graduate study
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {graduateStudyIndexes.map(({ field, index }, graduateIndex) => (
            <PdsSectionCard
              aria-label={`Graduate study ${graduateIndex + 1}`}
              contentClassName="px-4 pb-4 pt-0 sm:px-5 sm:pb-5"
              contentPadding={false}
              header={
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-ink">
                    Graduate study {graduateIndex + 1}
                  </h4>
                  <Button
                    className="!h-auto !rounded-sm !px-6 !py-2 !text-xs"
                    onClick={() => remove(index)}
                    type="button"
                    variant="danger"
                  >
                    Remove
                  </Button>
                </div>
              }
              headerClassName="p-4 pb-0 sm:p-5 sm:pb-0"
              key={field.id}
            >
              <div className="grid grid-cols-1 gap-x-4">
                <EducationFields
                  control={control}
                  graduateStudies
                  index={index}
                />
              </div>
            </PdsSectionCard>
          ))}
        </div>
      </section>

      <PdsStepFooter
        isFirstStep={false}
        isSaving={autosave.status === "saving"}
        isSubmitting={isSubmitting}
        onBack={async () => {
          if (await autosave.flush()) onBack();
        }}
        status={
          autosave.status === "saving"
            ? "Saving draft…"
            : autosave.status === "saved"
              ? "All changes saved"
              : (autosave.message ?? "Your draft saves automatically.")
        }
        submitMessage={submitMessage}
      />
    </form>
  );
}
