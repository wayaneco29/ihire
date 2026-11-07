"use client";

import { useState } from "react";
import { Button } from "antd";
import dayjs from "dayjs";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, type Resolver } from "react-hook-form";
import { FormDatePicker, FormInput } from "@/components/form";
import { DynamicRows } from "../DynamicRows";
import type { Json } from "@/types/database";
import { savePdsEligibilityStep } from "../../actions/steps-four-five";
import { usePdsStepAutosave } from "../../hooks/usePdsStepAutosave";
import { pdsStepFourSchema, type PdsStepFourValues } from "../../schema";
import { createStepFourDefaults } from "./step-four-defaults";

type Props = {
  draftData: Json;
  onCompleted: (nextStep: number, stepData: Json) => void;
  pdsVersionId: string;
};

function serializableValues(values: PdsStepFourValues) {
  return {
    eligibility: values.eligibility.map((row) => ({
      ...row,
      exam_date: row.exam_date ? dayjs(row.exam_date).format("YYYY-MM-DD") : null,
      license_valid_until: row.license_valid_until
        ? dayjs(row.license_valid_until).format("YYYY-MM-DD")
        : null,
    })),
  };
}

export function EligibilityStep({ draftData, onCompleted, pdsVersionId }: Props) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<PdsStepFourValues>({
    defaultValues: createStepFourDefaults(draftData),
    mode: "onBlur",
    resolver: yupResolver(pdsStepFourSchema) as Resolver<PdsStepFourValues>,
  });
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const values = watch();
  const autosave = usePdsStepAutosave(
    pdsVersionId,
    4,
    values as unknown as Record<string, unknown>,
  );

  async function submitStep(valuesToSave: PdsStepFourValues) {
    setSubmitMessage(null);
    const savedValues = serializableValues(valuesToSave);
    const result = await savePdsEligibilityStep(pdsVersionId, savedValues);
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
      <div>
        <h3 className="text-base font-semibold text-ink">
          Civil service eligibility
        </h3>
        <p className="mt-1 text-sm leading-6 text-muted">
          Add each eligibility you hold. Leave this section empty if you have none.
        </p>
      </div>

      <DynamicRows
        addLabel="Add eligibility"
        control={control}
        createRow={() => ({
          eligibility_name: "",
          rating: null,
          exam_date: null,
          exam_place: "",
          license_no: "",
          license_valid_until: null,
        })}
        label="Eligibility"
        maxRows={100}
        name="eligibility"
        renderRow={(index) => (
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormInput
              control={control}
              label="Career service / eligibility name"
              name={`eligibility.${index}.eligibility_name`}
              required
            />
            <FormInput
              control={control}
              label="Rating"
              max={100}
              min={0}
              name={`eligibility.${index}.rating`}
              step="0.01"
              type="number"
            />
            <FormDatePicker
              control={control}
              format="MMMM D, YYYY"
              label="Date of examination / conferment"
              name={`eligibility.${index}.exam_date`}
            />
            <FormInput
              control={control}
              label="Place of examination / conferment"
              name={`eligibility.${index}.exam_place`}
            />
            <FormInput
              control={control}
              label="License No."
              name={`eligibility.${index}.license_no`}
            />
            <FormDatePicker
              control={control}
              format="MMMM D, YYYY"
              label="License validity date"
              name={`eligibility.${index}.license_valid_until`}
            />
          </div>
        )}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
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
