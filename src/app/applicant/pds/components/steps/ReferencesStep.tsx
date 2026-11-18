"use client";

import { useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, type Resolver } from "react-hook-form";
import { FormCheckbox, FormInput, FormTextArea } from "@/components/form";
import type { Json } from "@/types/database";
import { savePdsReferencesStep } from "../../actions/steps-ten-eleven";
import { usePdsStepAutosave } from "../../hooks/usePdsStepAutosave";
import { pdsStepTenSchema, type PdsStepTenValues } from "../../schema";
import { createStepTenDefaults } from "./step-ten-defaults";
import { PdsSectionCard } from "../PdsSectionCard";
import { PdsStepFooter } from "../PdsStepFooter";

type Props = {
  draftData: Json;
  onBack: () => void;
  onCompleted: (nextStep: number, stepData: Json) => void;
  pdsVersionId: string;
};

export function ReferencesStep({
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
      {values.references.map((_, index) => (
        <PdsSectionCard
          aria-labelledby={`reference-heading-${index + 1}`}
          contentClassName="px-4 pb-4 pt-0 sm:px-5 sm:pb-5"
          contentPadding={false}
          header={
            <h4
              className="mb-4 text-sm font-semibold text-ink"
              id={`reference-heading-${index + 1}`}
            >
              Reference {index + 1}
            </h4>
          }
          headerClassName="p-4 pb-0 sm:p-5 sm:pb-0"
          key={index}
        >
          <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
            <FormInput
              control={control}
              label="Full name"
              name={`references.${index}.name`}
              required
            />
            <FormInput
              control={control}
              hint="Enter a phone number, email address, or both."
              label="Contact no. and/or email"
              name={`references.${index}.contact`}
              required
            />
          </div>
          <div className="grid grid-cols-1 mt-2.5">
            <FormTextArea
              control={control}
              label="Office / residential address"
              name={`references.${index}.address`}
              required
              rows={2}
            />
          </div>
        </PdsSectionCard>
      ))}

      <FormCheckbox
        control={control}
        label="I confirm these three references are not related to me by consanguinity or affinity."
        name="confirm_unrelated"
        required
      />

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
