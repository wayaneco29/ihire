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
import { COUNTRY_OPTIONS } from "@/constants/pds-options";
import { PDS_QUESTIONNAIRE_ITEMS } from "@/constants/pds-questionnaire";
import type { Json } from "@/types/database";
import { savePdsQuestionnaireStep } from "../../actions/steps-eight-nine";
import { usePdsStepAutosave } from "../../hooks/usePdsStepAutosave";
import { pdsStepNineSchema, type PdsStepNineValues } from "../../schema";
import { createStepNineDefaults } from "./step-nine-defaults";

type Props = {
  draftData: Json;
  onCompleted: (nextStep: number, stepData: Json) => void;
  pdsVersionId: string;
};

function serializableValues(values: PdsStepNineValues) {
  return {
    questionnaire: values.questionnaire.map((row) => ({
      ...row,
      date_filed: row.date_filed
        ? dayjs(row.date_filed).format("YYYY-MM-DD")
        : null,
    })),
  };
}

export function QuestionnaireStep({
  draftData,
  onCompleted,
  pdsVersionId,
}: Props) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<PdsStepNineValues>({
    defaultValues: createStepNineDefaults(draftData),
    mode: "onBlur",
    resolver: yupResolver(pdsStepNineSchema) as Resolver<PdsStepNineValues>,
  });
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const values = watch();
  const autosave = usePdsStepAutosave(
    pdsVersionId,
    9,
    values as unknown as Record<string, unknown>,
  );

  async function submitStep(valuesToSave: PdsStepNineValues) {
    setSubmitMessage(null);
    const savedValues = serializableValues(valuesToSave);
    const result = await savePdsQuestionnaireStep(pdsVersionId, savedValues);
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
    <form className="space-y-5" onSubmit={handleSubmit(submitStep)}>
      <div className="mb-6">
        <h3 className="text-base font-semibold text-ink">Questionnaire</h3>
        <p className="mt-1 text-sm leading-6 text-muted">
          Answer all twelve items. Follow-up fields appear when you answer Yes.
        </p>
      </div>

      {PDS_QUESTIONNAIRE_ITEMS.map((item, index) => {
        const answer = values.questionnaire[index]?.answer;
        return (
          <section
            aria-labelledby={`pds-question-${item.code}`}
            className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5"
            key={item.code}
          >
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem] md:items-start">
              <h4
                className="text-sm font-medium leading-6 text-ink"
                id={`pds-question-${item.code}`}
              >
                <span className="mr-2 font-semibold text-primary">{item.code}</span>
                {item.question}
              </h4>
              <FormRadioYesNo
                control={control}
                label="Answer"
                name={`questionnaire.${index}.answer`}
                required
              />
            </div>

            {answer === true && (
              <div className="mt-3 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                {item.code === "39" ? (
                  <FormSelect
                    control={control}
                    label={item.detailLabel}
                    name={`questionnaire.${index}.country`}
                    options={COUNTRY_OPTIONS}
                    placeholder="Choose country"
                    required
                    showSearch
                  />
                ) : item.code === "40B" || item.code === "40C" ? (
                  <FormInput
                    control={control}
                    label={item.detailLabel}
                    name={`questionnaire.${index}.id_no`}
                    required
                  />
                ) : item.code === "35B" ? (
                  <>
                    <FormTextArea
                      control={control}
                      label={item.detailLabel}
                      maxLength={1500}
                      name={`questionnaire.${index}.details`}
                      required
                      rows={3}
                    />
                    <FormDatePicker
                      control={control}
                      format="MMMM D, YYYY"
                      label="Date filed"
                      name={`questionnaire.${index}.date_filed`}
                      required
                    />
                    <FormInput
                      control={control}
                      label="Status of case"
                      name={`questionnaire.${index}.case_status`}
                      required
                    />
                  </>
                ) : (
                  <FormTextArea
                    control={control}
                    label={item.detailLabel}
                    maxLength={1500}
                    name={`questionnaire.${index}.details`}
                    required
                    rows={3}
                  />
                )}
              </div>
            )}
          </section>
        );
      })}

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
