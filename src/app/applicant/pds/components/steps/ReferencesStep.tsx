"use client";

import { useState } from "react";
import { Button } from "antd";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, type Resolver } from "react-hook-form";
import { FormCheckbox, FormInput, FormTextArea } from "@/components/form";
import type { Json } from "@/types/database";
import { savePdsReferencesStep } from "../../actions/steps-ten-eleven";
import { usePdsStepAutosave } from "../../hooks/usePdsStepAutosave";
import { pdsStepTenSchema, type PdsStepTenValues } from "../../schema";
import { createStepTenDefaults } from "./step-ten-defaults";

type Props = {
  draftData: Json;
  onCompleted: (nextStep: number, stepData: Json) => void;
  pdsVersionId: string;
};

export function ReferencesStep({ draftData, onCompleted, pdsVersionId }: Props) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<PdsStepTenValues>({
    defaultValues: createStepTenDefaults(draftData),
    mode: "onBlur",
    resolver: yupResolver(pdsStepTenSchema) as Resolver<PdsStepTenValues>,
  });
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const values = watch();
  const autosave = usePdsStepAutosave(
    pdsVersionId,
    10,
    values as unknown as Record<string, unknown>,
  );

  async function submitStep(valuesToSave: PdsStepTenValues) {
    setSubmitMessage(null);
    const result = await savePdsReferencesStep(pdsVersionId, valuesToSave);
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
    <form className="space-y-5" onSubmit={handleSubmit(submitStep)}>
      <div>
        <h3 className="text-base font-semibold text-ink">References</h3>
        <p className="mt-1 text-sm leading-6 text-muted">
          Enter exactly three people who are not related to you by consanguinity or affinity.
        </p>
      </div>

      {values.references.map((_, index) => (
        <section
          aria-labelledby={`reference-heading-${index + 1}`}
          className="rounded-xl border border-line bg-panel p-4 sm:p-5"
          key={index}
        >
          <h4
            className="mb-4 text-sm font-semibold text-ink"
            id={`reference-heading-${index + 1}`}
          >
            Reference {index + 1}
          </h4>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <FormInput
              control={control}
              label="Full name"
              name={`references.${index}.name`}
              required
            />
            <FormTextArea
              control={control}
              label="Office / residential address"
              name={`references.${index}.address`}
              required
              rows={2}
            />
            <FormInput
              control={control}
              hint="Enter a phone number, email address, or both."
              label="Contact no. and/or email"
              name={`references.${index}.contact`}
              required
            />
          </div>
        </section>
      ))}

      <FormCheckbox
        control={control}
        label="I confirm these three references are not related to me by consanguinity or affinity."
        name="confirm_unrelated"
        required
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
