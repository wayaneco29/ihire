"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { PlusIcon } from "@heroicons/react/24/outline";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, type Resolver } from "react-hook-form";
import { FormDatePicker, FormInput, FormTextArea } from "@/components/form";
import { DynamicRows } from "../DynamicRows";
import { PdsSectionCard } from "../PdsSectionCard";
import { PdsPersonPlusIcon } from "../PdsPersonPlusIcon";
import type { Json } from "@/types/database";
import { savePdsVoluntaryWorkStep } from "../../actions/steps-six-seven";
import { usePdsStepAutosave } from "../../hooks/usePdsStepAutosave";
import { pdsStepSixSchema, type PdsStepSixValues } from "../../schema";
import { createStepSixDefaults } from "./step-six-defaults";
import { PdsStepFooter } from "../PdsStepFooter";

type Props = {
  draftData: Json;
  onBack: () => void;
  onCompleted: (nextStep: number, stepData: Json) => void;
  pdsVersionId: string;
};

function serializableValues(values: PdsStepSixValues) {
  return {
    voluntaryWork: values.voluntaryWork.map((row) => ({
      ...row,
      date_from: row.date_from
        ? dayjs(row.date_from).format("YYYY-MM-DD")
        : null,
      date_to: row.date_to ? dayjs(row.date_to).format("YYYY-MM-DD") : null,
    })),
  };
}

export function VoluntaryWorkStep({
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
  } = useForm<PdsStepSixValues>({
    defaultValues: createStepSixDefaults(draftData),
    mode: "onBlur",
    resolver: yupResolver(pdsStepSixSchema) as Resolver<PdsStepSixValues>,
  });
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const values = watch();
  const autosave = usePdsStepAutosave(
    pdsVersionId,
    6,
    values as unknown as Record<string, unknown>,
  );

  async function submitStep(valuesToSave: PdsStepSixValues) {
    setSubmitMessage(null);
    const savedValues = serializableValues(valuesToSave);
    const result = await savePdsVoluntaryWorkStep(pdsVersionId, savedValues);
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
      <PdsSectionCard title="Voluntary work">
        <p className="mb-4 text-sm leading-6 text-muted">
          Include the organization and address, dates, hours, and position or
          nature of work. Leave this section empty if it does not apply.
        </p>

        <DynamicRows
          addButtonPlacement="last-row"
          addLabel="Add voluntary work"
          addButtonVariant="filled"
          addIcon={<PlusIcon aria-hidden="true" className="size-4" />}
          control={control}
          createRow={() => ({
            organization_name_address: "",
            date_from: null,
            date_to: null,
            hours: null,
            position_nature: "",
          })}
          label="Voluntary work"
          maxRows={100}
          emptyDescription="Add an organization or service activity if this applies to you."
          emptyIcon={<PdsPersonPlusIcon />}
          emptyTitle="No voluntary work added yet"
          name="voluntaryWork"
          renderRow={(index) => (
            <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <FormTextArea
                  control={control}
                  label="Organization name and address"
                  name={`voluntaryWork.${index}.organization_name_address`}
                  required
                  rows={2}
                />
              </div>
              <FormDatePicker
                control={control}
                format="MMMM D, YYYY"
                label="From"
                name={`voluntaryWork.${index}.date_from`}
              />
              <FormDatePicker
                control={control}
                format="MMMM D, YYYY"
                label="To"
                name={`voluntaryWork.${index}.date_to`}
              />
              <FormInput
                control={control}
                label="Number of hours"
                min={0}
                name={`voluntaryWork.${index}.hours`}
                step="0.5"
                type="number"
              />
              <FormInput
                control={control}
                label="Position / nature of work"
                name={`voluntaryWork.${index}.position_nature`}
              />
            </div>
          )}
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
