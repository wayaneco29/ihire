"use client";

import { useState } from "react";
import { Button } from "antd";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, type Resolver } from "react-hook-form";
import { FormSelect, FormTextArea } from "@/components/form";
import { OTHER_INFO_CATEGORY_OPTIONS } from "@/constants/pds-options";
import { DynamicRows } from "../DynamicRows";
import type { Json } from "@/types/database";
import { savePdsOtherInfoStep } from "../../actions/steps-eight-nine";
import { usePdsStepAutosave } from "../../hooks/usePdsStepAutosave";
import { pdsStepEightSchema, type PdsStepEightValues } from "../../schema";
import { createStepEightDefaults } from "./step-eight-defaults";

type Props = {
  draftData: Json;
  onCompleted: (nextStep: number, stepData: Json) => void;
  pdsVersionId: string;
};

export function OtherInformationStep({
  draftData,
  onCompleted,
  pdsVersionId,
}: Props) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<PdsStepEightValues>({
    defaultValues: createStepEightDefaults(draftData),
    mode: "onBlur",
    resolver: yupResolver(pdsStepEightSchema) as Resolver<PdsStepEightValues>,
  });
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const values = watch();
  const autosave = usePdsStepAutosave(
    pdsVersionId,
    8,
    values as unknown as Record<string, unknown>,
  );

  async function submitStep(valuesToSave: PdsStepEightValues) {
    setSubmitMessage(null);
    const result = await savePdsOtherInfoStep(pdsVersionId, valuesToSave);
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
        <h3 className="text-base font-semibold text-ink">Other information</h3>
        <p className="mt-1 text-sm leading-6 text-muted">
          Add special skills and hobbies, non-academic distinctions, or memberships in associations.
          Leave this section empty if it does not apply.
        </p>
      </div>

      <DynamicRows
        addLabel="Add entry"
        control={control}
        createRow={() => ({
          category: "" as PdsStepEightValues["otherInfo"][number]["category"],
          description: "",
        })}
        label="Other information"
        maxRows={100}
        name="otherInfo"
        renderRow={(index) => (
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <FormSelect
              control={control}
              label="Category"
              name={`otherInfo.${index}.category`}
              options={[...OTHER_INFO_CATEGORY_OPTIONS]}
              placeholder="Choose category"
              required
            />
            <FormTextArea
              control={control}
              label="Description"
              maxLength={1000}
              name={`otherInfo.${index}.description`}
              required
              rows={3}
              showCount
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
