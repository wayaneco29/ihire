"use client";

import { useState } from "react";
import { Button } from "antd";
import dayjs from "dayjs";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, type Resolver } from "react-hook-form";
import {
  FormDatePicker,
  FormInput,
} from "@/components/form";
import { DynamicRows } from "../DynamicRows";
import type { Json } from "@/types/database";
import { usePdsStepAutosave } from "../../hooks/usePdsStepAutosave";
import { pdsStepTwoSchema, type PdsStepTwoValues } from "../../schema";
import { savePdsFamilyStep } from "../../actions/steps-one-three";
import { createStepTwoDefaults } from "./step-two-defaults";

type Props = {
  draftData: Json;
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
      <section>
        <h3 className="mb-4 text-base font-semibold text-ink">
          Spouse
        </h3>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormInput control={control} label="Surname" name="familyBackground.spouse_surname" />
          <FormInput control={control} label="First name" name="familyBackground.spouse_first_name" />
          <FormInput control={control} label="Middle name" name="familyBackground.spouse_middle_name" />
          <FormInput
            control={control}
            hint="For example, Jr. or Sr."
            label="Name extension"
            name="familyBackground.spouse_name_extension"
          />
          <FormInput control={control} label="Occupation" name="familyBackground.spouse_occupation" />
          <FormInput control={control} label="Employer / business name" name="familyBackground.spouse_employer" />
          <FormInput control={control} label="Business address" name="familyBackground.spouse_business_address" />
          <FormInput
            control={control}
            label="Telephone No."
            name="familyBackground.spouse_telephone_no"
            type="tel"
          />
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-base font-semibold text-ink">Father</h3>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormInput control={control} label="Surname" name="familyBackground.father_surname" />
          <FormInput control={control} label="First name" name="familyBackground.father_first_name" />
          <FormInput control={control} label="Middle name" name="familyBackground.father_middle_name" />
          <FormInput
            control={control}
            hint="For example, Jr. or Sr."
            label="Name extension"
            name="familyBackground.father_name_extension"
          />
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-base font-semibold text-ink">
          Mother&apos;s maiden name
        </h3>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormInput control={control} label="Surname" name="familyBackground.mother_surname" />
          <FormInput control={control} label="First name" name="familyBackground.mother_first_name" />
          <FormInput control={control} label="Middle name" name="familyBackground.mother_middle_name" />
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-ink">Children</h3>
          <p className="mt-1 text-sm text-muted">
            Add each child&apos;s full name and date of birth. Leave this section empty if not applicable.
          </p>
        </div>
        <DynamicRows
          addLabel="Add child"
          control={control}
          createRow={() => ({ full_name: "", date_of_birth: null })}
          label="Child"
          name="children"
          renderRow={(index) => (
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <FormInput
                control={control}
                label="Full name"
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
      </section>

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
