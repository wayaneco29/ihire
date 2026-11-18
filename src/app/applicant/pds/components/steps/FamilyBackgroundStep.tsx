"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { PlusIcon } from "@heroicons/react/24/outline";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, type Resolver } from "react-hook-form";
import { FormDatePicker, FormInput, FormSelect } from "@/components/form";
import { DynamicRows } from "../DynamicRows";
import type { Json } from "@/types/database";
import { usePdsStepAutosave } from "../../hooks/usePdsStepAutosave";
import { pdsStepTwoSchema, type PdsStepTwoValues } from "../../schema";
import { savePdsFamilyStep } from "../../actions/steps-one-three";
import { createStepTwoDefaults } from "./step-two-defaults";
import { PdsSectionCard } from "../PdsSectionCard";
import { PdsStepFooter } from "../PdsStepFooter";
import { NAME_EXTENSION_OPTIONS } from "@/constants/pds-options";
import { PdsPersonPlusIcon } from "../PdsPersonPlusIcon";

type Props = {
  draftData: Json;
  onBack: () => void;
  onCompleted: (nextStep: number, stepData: Json) => void;
  pdsVersionId: string;
};

function serializableValues(values: PdsStepTwoValues) {
  return {
    ...values,
    children: values.children.map((child) => ({
      ...child,
      date_of_birth: child.date_of_birth
        ? dayjs(child.date_of_birth).format("YYYY-MM-DD")
        : null,
    })),
  };
}

export function FamilyBackgroundStep({
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
  } = useForm<PdsStepTwoValues>({
    defaultValues: createStepTwoDefaults(draftData),
    mode: "onBlur",
    resolver: yupResolver(pdsStepTwoSchema) as Resolver<PdsStepTwoValues>,
  });
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const values = watch();
  const autosave = usePdsStepAutosave(
    pdsVersionId,
    2,
    values as unknown as Record<string, unknown>,
  );

  async function submitStep(valuesToSave: PdsStepTwoValues) {
    setSubmitMessage(null);
    const savedValues = serializableValues(valuesToSave);
    const result = await savePdsFamilyStep(pdsVersionId, savedValues);
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
    <form className="space-y-8" onSubmit={handleSubmit(submitStep)}>
      <PdsSectionCard title="Spouse">
        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <FormInput
            control={control}
            label="Surname"
            name="familyBackground.spouse_surname"
          />
          <FormInput
            control={control}
            label="First name"
            name="familyBackground.spouse_first_name"
          />
          <FormInput
            control={control}
            label="Middle name"
            name="familyBackground.spouse_middle_name"
          />
          <FormSelect
            control={control}
            label="Name extension"
            options={[...NAME_EXTENSION_OPTIONS]}
            name="familyBackground.spouse_name_extension"
          />
          <FormInput
            control={control}
            label="Occupation"
            name="familyBackground.spouse_occupation"
          />
          <FormInput
            control={control}
            label="Employer / business name"
            name="familyBackground.spouse_employer"
          />
          <FormInput
            control={control}
            label="Business address"
            name="familyBackground.spouse_business_address"
          />
          <FormInput
            control={control}
            label="Telephone No."
            name="familyBackground.spouse_telephone_no"
            type="tel"
          />
        </div>
      </PdsSectionCard>

      <PdsSectionCard title="Father">
        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <FormInput
            control={control}
            label="Surname"
            name="familyBackground.father_surname"
          />
          <FormInput
            control={control}
            label="First name"
            name="familyBackground.father_first_name"
          />
          <FormInput
            control={control}
            label="Middle name"
            name="familyBackground.father_middle_name"
          />
          <FormSelect
            control={control}
            label="Name extension"
            options={[...NAME_EXTENSION_OPTIONS]}
            name="familyBackground.father_name_extension"
          />
        </div>
      </PdsSectionCard>

      <PdsSectionCard title="Mother's maiden name">
        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <FormInput
            control={control}
            label="Surname"
            name="familyBackground.mother_surname"
          />
          <FormInput
            control={control}
            label="First name"
            name="familyBackground.mother_first_name"
          />
          <FormInput
            control={control}
            label="Middle name"
            name="familyBackground.mother_middle_name"
          />
        </div>
      </PdsSectionCard>

      <PdsSectionCard title="Children">
        <DynamicRows
          addButtonPlacement="last-row"
          addLabel="Add child"
          addButtonVariant="filled"
          addIcon={<PlusIcon aria-hidden="true" className="size-4" />}
          control={control}
          createRow={() => ({ full_name: "", date_of_birth: null })}
          emptyDescription="Add a child if this applies to you. You'll enter their name and date of birth."
          emptyIcon={<PdsPersonPlusIcon />}
          emptyTitle="No children added yet"
          label="Child"
          name="children"
          renderRow={(index) => (
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <FormInput
                control={control}
                label="Full name"
                placeholder="Enter full name"
                name={`children.${index}.full_name`}
                required
              />
              <FormDatePicker
                control={control}
                format="MMMM D, YYYY"
                label="Date of birth"
                name={`children.${index}.date_of_birth`}
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
