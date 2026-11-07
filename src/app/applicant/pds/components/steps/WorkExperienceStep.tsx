"use client";

import { useState } from "react";
import { Button } from "antd";
import dayjs from "dayjs";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, type Resolver } from "react-hook-form";
import {
  FormDatePicker,
  FormInput,
  FormRadioYesNo,
  FormSelect,
  FormTextArea,
} from "@/components/form";
import { APPOINTMENT_STATUS_OPTIONS } from "@/constants/pds-options";
import { DynamicRows } from "../DynamicRows";
import type { Json } from "@/types/database";
import { savePdsWorkExperienceStep } from "../../actions/steps-four-five";
import { usePdsStepAutosave } from "../../hooks/usePdsStepAutosave";
import { pdsStepFiveSchema, type PdsStepFiveValues } from "../../schema";
import { createStepFiveDefaults } from "./step-five-defaults";

type Props = {
  draftData: Json;
  onCompleted: (nextStep: number, stepData: Json) => void;
  pdsVersionId: string;
};

function serializableValues(values: PdsStepFiveValues) {
  return {
    workExperience: values.workExperience.map((row) => ({
      ...row,
      date_from: row.date_from ? dayjs(row.date_from).format("YYYY-MM-DD") : "",
      date_to: row.date_to ? dayjs(row.date_to).format("YYYY-MM-DD") : null,
    })),
  };
}

export function WorkExperienceStep({
  draftData,
  onCompleted,
  pdsVersionId,
}: Props) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<PdsStepFiveValues>({
    defaultValues: createStepFiveDefaults(draftData),
    mode: "onBlur",
    resolver: yupResolver(pdsStepFiveSchema) as Resolver<PdsStepFiveValues>,
  });
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const values = watch();
  const autosave = usePdsStepAutosave(
    pdsVersionId,
    5,
    values as unknown as Record<string, unknown>,
  );

  async function submitStep(valuesToSave: PdsStepFiveValues) {
    setSubmitMessage(null);
    const savedValues = serializableValues(valuesToSave);
    const result = await savePdsWorkExperienceStep(pdsVersionId, savedValues);
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
        <h3 className="text-base font-semibold text-ink">Work experience</h3>
        <p className="mt-1 text-sm leading-6 text-muted">
          Add each role with the most recent start date first. The saved list will be sorted this way.
          Leave the end date blank for a current position. This section may be left empty.
        </p>
      </div>

      <DynamicRows
        addLabel="Add work experience"
        control={control}
        createRow={() => ({
          date_from: null,
          date_to: null,
          position_title: "",
          agency_company: "",
          monthly_salary: null,
          salary_grade_step: "",
          appointment_status: "",
          appointment_status_other: "",
          is_gov_service: null,
          duties_description: "",
        })}
        label="Work experience"
        maxRows={100}
        name="workExperience"
        renderRow={(index) => {
          const status = values.workExperience?.[index]?.appointment_status;
          return (
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormDatePicker
                control={control}
                format="MMMM D, YYYY"
                label="From"
                name={`workExperience.${index}.date_from`}
                required
              />
              <FormDatePicker
                control={control}
                format="MMMM D, YYYY"
                hint="Leave blank if you currently hold this position."
                label="To"
                name={`workExperience.${index}.date_to`}
              />
              <FormInput
                control={control}
                label="Position title"
                name={`workExperience.${index}.position_title`}
                required
              />
              <FormInput
                control={control}
                label="Agency / company"
                name={`workExperience.${index}.agency_company`}
                required
              />
              <FormInput
                control={control}
                label="Monthly salary"
                min={0}
                name={`workExperience.${index}.monthly_salary`}
                step="0.01"
                type="number"
              />
              <FormInput
                control={control}
                label="Salary grade / step"
                name={`workExperience.${index}.salary_grade_step`}
              />
              <FormSelect
                allowClear
                control={control}
                label="Status of appointment"
                name={`workExperience.${index}.appointment_status`}
                options={[...APPOINTMENT_STATUS_OPTIONS]}
                placeholder="Choose status"
              />
              {status === "Other" && (
                <FormInput
                  control={control}
                  label="Please specify appointment status"
                  name={`workExperience.${index}.appointment_status_other`}
                  required
                />
              )}
              <FormRadioYesNo
                control={control}
                label="Government service"
                name={`workExperience.${index}.is_gov_service`}
                required
              />
              <div className="sm:col-span-2 lg:col-span-3">
                <FormTextArea
                  control={control}
                  label="Brief description of duties"
                  maxLength={3000}
                  name={`workExperience.${index}.duties_description`}
                  rows={3}
                  showCount
                />
              </div>
            </div>
          );
        }}
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
