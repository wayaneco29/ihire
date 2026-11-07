"use client";

import { useEffect, useState } from "react";
import { Button } from "antd";
import dayjs from "dayjs";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, type Resolver } from "react-hook-form";
import { FormCheckbox, FormDatePicker, FormInput, FormRadio, FormSelect } from "@/components/form";
import {
  BLOOD_TYPE_OPTIONS,
  CIVIL_STATUS_OPTIONS,
  COUNTRY_OPTIONS,
} from "@/constants/pds-options";
import type { Json } from "@/types/database";
import { usePdsStepAutosave } from "../../hooks/usePdsStepAutosave";
import { pdsStepOneSchema, type PdsAddressValues, type PdsStepOneValues } from "../../schema";
import { savePdsPersonalStep } from "../../actions/steps-one-three";
import { AddressFields } from "./AddressFields";
import { createStepOneDefaults } from "./step-one-defaults";

type Props = {
  draftData: Json;
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
    setValue(
      "addresses.permanent",
      residential as PdsAddressValues,
      { shouldDirty: true, shouldValidate: true },
    );
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
      <section>
        <h3 className="mb-4 text-base font-semibold text-ink">
          Personal details
        </h3>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormInput control={control} label="Surname" name="personalInfo.surname" required />
          <FormInput control={control} label="First name" name="personalInfo.first_name" required />
          <FormInput control={control} label="Middle name" name="personalInfo.middle_name" />
          <FormInput
            control={control}
            hint="For example, Jr. or Sr."
            label="Name extension"
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
      </section>

      <section>
        <h3 className="mb-4 text-base font-semibold text-ink">
          Citizenship and identification
        </h3>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <FormInput control={control} label="UMID No." name="personalInfo.umid_no" />
          <FormInput control={control} label="Pag-IBIG No." name="personalInfo.pagibig_no" />
          <FormInput control={control} label="PhilHealth No." name="personalInfo.philhealth_no" />
          <FormInput control={control} label="PhilSys No." name="personalInfo.philsys_no" />
          <FormInput control={control} label="TIN" name="personalInfo.tin_no" />
          <FormInput
            control={control}
            label="Agency employee No."
            name="personalInfo.agency_employee_no"
          />
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-base font-semibold text-ink">Contact details</h3>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
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
      </section>

      <section>
        <h3 className="mb-4 text-base font-semibold text-ink">Residential address</h3>
        <AddressFields control={control} prefix="addresses.residential" />
      </section>

      <section>
        <h3 className="mb-2 text-base font-semibold text-ink">Permanent address</h3>
        <FormCheckbox
          control={control}
          hint="We will use the residential address above for both address records."
          label="Same as residential address"
          name="addresses.sameAsResidential"
        />
        <AddressFields
          control={control}
          disabled={sameAsResidential}
          prefix="addresses.permanent"
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
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
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
