"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { PlusIcon } from "@heroicons/react/24/outline";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, type Resolver } from "react-hook-form";
import { FormDatePicker, FormInput, FormSelect } from "@/components/form";
import { LEARNING_DEVELOPMENT_TYPE_OPTIONS } from "@/constants/pds-options";
import { DynamicRows } from "../DynamicRows";
import { PdsSectionCard } from "../PdsSectionCard";
import { PdsPersonPlusIcon } from "../PdsPersonPlusIcon";
import type { Json } from "@/types/database";
import { savePdsLearningStep } from "../../actions/steps-six-seven";
import { usePdsStepAutosave } from "../../hooks/usePdsStepAutosave";
import { pdsStepSevenSchema, type PdsStepSevenValues } from "../../schema";
import { createStepSevenDefaults } from "./step-seven-defaults";
import { PdsStepFooter } from "../PdsStepFooter";

type Props = {
  draftData: Json;
  onBack: () => void;
  onCompleted: (nextStep: number, stepData: Json) => void;
  pdsVersionId: string;
};

function serializableValues(values: PdsStepSevenValues) {
  return {
    learningDevelopment: values.learningDevelopment.map((row) => ({
      ...row,
      date_from: row.date_from
        ? dayjs(row.date_from).format("YYYY-MM-DD")
        : null,
      date_to: row.date_to ? dayjs(row.date_to).format("YYYY-MM-DD") : null,
    })),
  };
}

export function LearningDevelopmentStep({
  draftData,
  onBack,
  onCompleted,
  pdsVersionId,
}: Props) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<PdsStepSevenValues>({
    defaultValues: createStepSevenDefaults(draftData),
    mode: "onBlur",
    resolver: yupResolver(pdsStepSevenSchema) as Resolver<PdsStepSevenValues>,
  });
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const values = watch();
  const autosave = usePdsStepAutosave(
    pdsVersionId,
    7,
    values as unknown as Record<string, unknown>,
  );

  async function submitStep(valuesToSave: PdsStepSevenValues) {
    setSubmitMessage(null);
    const savedValues = serializableValues(valuesToSave);
    const result = await savePdsLearningStep(pdsVersionId, savedValues);
    if (!result.success) {
      setSubmitMessage(result.message);
      return;
    }
    onCompleted(
      result.currentStep,
      JSON.parse(JSON.stringify(savedValues)) as Json,
    );
  }

  return (
    <form className="space-y-7" onSubmit={handleSubmit(submitStep)}>
      <PdsSectionCard title="Learning and development">
        <p className="mb-4 text-sm leading-6 text-muted">
          Record training programs, seminars, workshops, and other learning
          activities. Leave the section empty if you have none.
        </p>

        <DynamicRows
          addButtonPlacement="last-row"
          addLabel="Add training or learning activity"
          addButtonVariant="filled"
          addIcon={<PlusIcon aria-hidden="true" className="size-4" />}
          control={control}
          createRow={() => ({
            title: "",
            date_from: null,
            date_to: null,
            hours: null,
            ld_type: "",
            ld_type_other: "",
            conducted_by: "",
          })}
          label="Learning activity"
          maxRows={100}
          emptyDescription="Add a seminar, workshop, or other learning activity if you have attended one."
          emptyIcon={<PdsPersonPlusIcon />}
          emptyTitle="No learning activities added yet"
          name="learningDevelopment"
          renderRow={(index) => {
            const type = values.learningDevelopment?.[index]?.ld_type;
            return (
              <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
                <FormInput
                  control={control}
                  label="Title of program"
                  name={`learningDevelopment.${index}.title`}
                  required
                />
                <FormDatePicker
                  control={control}
                  format="MMMM D, YYYY"
                  label="From"
                  name={`learningDevelopment.${index}.date_from`}
                />
                <FormDatePicker
                  control={control}
                  format="MMMM D, YYYY"
                  label="To"
                  name={`learningDevelopment.${index}.date_to`}
                />
                <FormInput
                  control={control}
                  label="Number of hours"
                  min={0}
                  name={`learningDevelopment.${index}.hours`}
                  step="0.5"
                  type="number"
                />
                <FormSelect
                  allowClear
                  control={control}
                  label="Type"
                  name={`learningDevelopment.${index}.ld_type`}
                  options={[...LEARNING_DEVELOPMENT_TYPE_OPTIONS]}
                  placeholder="Choose type"
                />
                {type === "Other" && (
                  <FormInput
                    control={control}
                    label="Please specify type"
                    name={`learningDevelopment.${index}.ld_type_other`}
                    required
                  />
                )}
                <FormInput
                  control={control}
                  label="Conducted by"
                  name={`learningDevelopment.${index}.conducted_by`}
                />
              </div>
            );
          }}
        />
      </PdsSectionCard>

      <PdsStepFooter
        isFirstStep={false}
        isSubmitting={isSubmitting}
        onBack={onBack}
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
