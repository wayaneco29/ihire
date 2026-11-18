"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, type Resolver } from "react-hook-form";
import {
  FormCheckbox,
  FormDatePicker,
  FormInput,
  FormRadio,
  FormSelect,
} from "@/components/form";
import {
  BLOOD_TYPE_OPTIONS,
  CIVIL_STATUS_OPTIONS,
  COUNTRY_OPTIONS,
  NAME_EXTENSION_OPTIONS,
} from "@/constants/pds-options";
import type { Json } from "@/types/database";
import { usePdsStepAutosave } from "../../hooks/usePdsStepAutosave";
import {
  pdsStepOneSchema,
  type PdsAddressValues,
  type PdsStepOneValues,
} from "../../schema";
import { savePdsPersonalStep } from "../../actions/steps-one-three";
import { AddressFields } from "./AddressFields";
import { createStepOneDefaults } from "./step-one-defaults";
import { PdsSectionCard } from "../PdsSectionCard";
import { PdsStepFooter } from "../PdsStepFooter";

type Props = {
  draftData: Json;
  onBack: () => void;
  onCompleted: (nextStep: number, stepData: Json) => void;
  pdsVersionId: string;
};

function serializableValues(values: PdsStepOneValues) {
  const date = values.personalInfo.date_of_birth;
  return {
    ...values,
    personalInfo: {
      ...values.personalInfo,
      date_of_birth: date ? dayjs(date).format("YYYY-MM-DD") : "",
    },
  };
}

export function PersonalInformationStep({
  draftData,
  onBack,
  onCompleted,
  pdsVersionId,
}: Props) {
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<PdsStepOneValues>({
    defaultValues: createStepOneDefaults(draftData),
    mode: "onBlur",
    resolver: yupResolver(pdsStepOneSchema) as Resolver<PdsStepOneValues>,
  });
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const values = watch();
  const sameAsResidential = watch("addresses.sameAsResidential");
  const residential = watch("addresses.residential");
  const permanent = watch("addresses.permanent");
  const residentialKey = JSON.stringify(residential);
  const permanentKey = JSON.stringify(permanent);
  const citizenship = watch("personalInfo.citizenship");
  const civilStatus = watch("personalInfo.civil_status");
  const autosave = usePdsStepAutosave(
    pdsVersionId,
    1,
    values as unknown as Record<string, unknown>,
  );

  useEffect(() => {
    if (!sameAsResidential || residentialKey === permanentKey) return;
    setValue("addresses.permanent", residential as PdsAddressValues, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [permanentKey, residential, residentialKey, sameAsResidential, setValue]);

  async function submitStep(valuesToSave: PdsStepOneValues) {
    setSubmitMessage(null);
    const savedValues = serializableValues(valuesToSave);
    const result = await savePdsPersonalStep(pdsVersionId, savedValues);
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
      <PdsSectionCard title="Personal details">
        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <FormInput
            control={control}
            label="Surname"
            name="personalInfo.surname"
            required
            placeholder="Enter Surname"
          />
          <FormInput
            control={control}
            label="First name"
            name="personalInfo.first_name"
            required
            placeholder="Enter First name"
          />
          <FormInput
            control={control}
            label="Middle name"
            name="personalInfo.middle_name"
            placeholder="Enter Middle name"
          />
          <FormSelect
            control={control}
            label="Name extension"
            options={[...NAME_EXTENSION_OPTIONS]}
            name="personalInfo.name_extension"
          />
          <FormDatePicker
            control={control}
            format="MMMM D, YYYY"
            label="Date of birth"
            name="personalInfo.date_of_birth"
            required
          />
          <FormInput
            control={control}
            label="Place of birth"
            name="personalInfo.place_of_birth"
            required
          />
          <FormRadio
            control={control}
            label="Sex at birth"
            name="personalInfo.sex_at_birth"
            options={[
              { label: "Male", value: "MALE" },
              { label: "Female", value: "FEMALE" },
            ]}
            required
          />
          <FormSelect
            control={control}
            label="Civil status"
            name="personalInfo.civil_status"
            options={[...CIVIL_STATUS_OPTIONS]}
            placeholder="Choose civil status"
            required
          />
          {civilStatus === "OTHER" && (
            <FormInput
              control={control}
              label="Please specify civil status"
              name="personalInfo.civil_status_other"
              required
            />
          )}
          <FormInput
            control={control}
            label="Height (meters)"
            min={0}
            name="personalInfo.height_m"
            placeholder="e.g. 1.65"
            step="0.01"
            type="number"
          />
          <FormInput
            control={control}
            label="Weight (kilograms)"
            min={0}
            name="personalInfo.weight_kg"
            placeholder="e.g. 60"
            step="0.01"
            type="number"
          />
          <FormSelect
            allowClear
            control={control}
            label="Blood type"
            name="personalInfo.blood_type"
            options={[...BLOOD_TYPE_OPTIONS]}
            placeholder="Choose blood type"
          />
        </div>
      </PdsSectionCard>

      <PdsSectionCard title="Citizenship and identification">
        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <FormRadio
            control={control}
            label="Citizenship"
            name="personalInfo.citizenship"
            options={[
              { label: "Filipino", value: "FILIPINO" },
              { label: "Dual citizenship", value: "DUAL" },
            ]}
            required
          />
          {citizenship === "DUAL" && (
            <>
              <FormRadio
                control={control}
                label="Dual citizenship acquired by"
                name="personalInfo.dual_citizenship_by"
                options={[
                  { label: "Birth", value: "BY_BIRTH" },
                  { label: "Naturalization", value: "BY_NATURALIZATION" },
                ]}
                required
              />
              <FormSelect
                control={control}
                label="Other country"
                name="personalInfo.dual_citizenship_country"
                options={COUNTRY_OPTIONS}
                placeholder="Choose country"
                required
                showSearch
              />
            </>
          )}
          <FormInput
            control={control}
            label="UMID No."
            name="personalInfo.umid_no"
          />
          <FormInput
            control={control}
            label="Pag-IBIG No."
            name="personalInfo.pagibig_no"
          />
          <FormInput
            control={control}
            label="PhilHealth No."
            name="personalInfo.philhealth_no"
          />
          <FormInput
            control={control}
            label="PhilSys No."
            name="personalInfo.philsys_no"
          />
          <FormInput control={control} label="TIN" name="personalInfo.tin_no" />
          <FormInput
            control={control}
            label="Agency employee No."
            name="personalInfo.agency_employee_no"
          />
        </div>
      </PdsSectionCard>

      <PdsSectionCard title="Contact details">
        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <FormInput
            control={control}
            label="Telephone No."
            name="personalInfo.telephone_no"
            type="tel"
          />
          <FormInput
            control={control}
            label="Mobile No."
            name="personalInfo.mobile_no"
            type="tel"
          />
          <FormInput
            control={control}
            label="Email address"
            name="personalInfo.email"
            required
            type="email"
          />
        </div>
      </PdsSectionCard>

      <PdsSectionCard title="Residential address">
        <AddressFields control={control} prefix="addresses.residential" />
      </PdsSectionCard>

      <PdsSectionCard title="Permanent address">
        <div>
          <FormCheckbox
            control={control}
            hint="We will use the residential address above for both address records."
            label="Same as residential address"
            name="addresses.sameAsResidential"
          />
        </div>
        <AddressFields
          control={control}
          disabled={sameAsResidential}
          prefix="addresses.permanent"
        />
      </PdsSectionCard>

      <PdsStepFooter
        isFirstStep
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
