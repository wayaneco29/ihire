"use client";

import { useState } from "react";
import { Button } from "antd";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, type Resolver } from "react-hook-form";
import { FormInput, FormSelect } from "@/components/form";
import { EDUCATION_LEVEL_OPTIONS } from "@/constants/pds-options";
import { DynamicRows } from "../DynamicRows";
import type { Json } from "@/types/database";
import { savePdsEducationStep } from "../../actions/steps-one-three";
import { usePdsStepAutosave } from "../../hooks/usePdsStepAutosave";
import { pdsStepThreeSchema, type PdsStepThreeValues } from "../../schema";
import { createStepThreeDefaults } from "./step-three-defaults";

type Props = {
  draftData: Json;
  onCompleted: (nextStep: number, stepData: Json) => void;
  pdsVersionId: string;
};

export function EducationStep({ draftData, onCompleted, pdsVersionId }: Props) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<PdsStepThreeValues>({
    defaultValues: createStepThreeDefaults(draftData),
    mode: "onBlur",
    resolver: yupResolver(pdsStepThreeSchema) as Resolver<PdsStepThreeValues>,
  });
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const values = watch();
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
        <h3 className="text-base font-semibold text-ink">
          Educational background
        </h3>
        <p className="mt-1 text-sm leading-6 text-muted">
          Add each education level you attended, from elementary through graduate studies.
          You can include up to five levels.
        </p>
      </div>

      <DynamicRows
        addLabel="Add education level"
        control={control}
        createRow={() => ({
          level: "" as PdsStepThreeValues["education"][number]["level"],
          school_name: "",
          degree_course: "",
          period_from: null,
          period_to: null,
          highest_level_units_earned: "",
          year_graduated: null,
          honors_received: "",
        })}
        label="Education level"
        maxRows={5}
        name="education"
        renderRow={(index) => (
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormSelect
              control={control}
              label="Level"
              name={`education.${index}.level`}
              options={[...EDUCATION_LEVEL_OPTIONS]}
              placeholder="Choose level"
              required
            />
            <FormInput
              control={control}
              label="Name of school"
              name={`education.${index}.school_name`}
            />
            <FormInput
              control={control}
              label="Degree / course"
              name={`education.${index}.degree_course`}
            />
            <FormInput
              control={control}
              label="Period from (year)"
              max={new Date().getFullYear()}
              min={1900}
              name={`education.${index}.period_from`}
              type="number"
            />
            <FormInput
              control={control}
              label="Period to (year)"
              max={new Date().getFullYear()}
              min={1900}
              name={`education.${index}.period_to`}
              type="number"
            />
            <FormInput
              control={control}
              label="Highest level / units earned"
              name={`education.${index}.highest_level_units_earned`}
            />
            <FormInput
              control={control}
              label="Year graduated"
              max={new Date().getFullYear()}
              min={1900}
              name={`education.${index}.year_graduated`}
              type="number"
            />
            <FormInput
              control={control}
              label="Scholarship / honors received"
              name={`education.${index}.honors_received`}
            />
          </div>
        )}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-5">
        <p aria-live="polite" className="text-sm text-muted">
          {autosave.status === "saving"
            ? "Saving draft…"
            : autosave.status === "saved"
              ? "Draft saved"
              : autosave.message ?? "Your draft saves automatically."}
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          {submitMessage && (
            <p className="text-sm text-danger" role="alert">
              {submitMessage}
            </p>
          )}
          <Button
            disabled={isSubmitting}
            htmlType="submit"
            loading={isSubmitting}
            type="primary"
          >
            Save and continue
          </Button>
        </div>
      </div>
    </form>
  );
}
