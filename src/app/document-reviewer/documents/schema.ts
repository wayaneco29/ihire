import * as yup from "yup";

export const DOCUMENT_REVIEW_STATUSES = [
  "VERIFIED",
  "REJECTED",
  "FOR_RESUBMISSION",
] as const;

const confirmedMetric = () =>
  yup
    .number()
    .transform((value, originalValue) => originalValue === "" ? null : value)
    .nullable()
    .optional()
    .min(0, "The confirmed value cannot be negative.")
    .max(99999999.99, "Enter a value no greater than 99,999,999.99.")
    .test(
      "two-decimal-places",
      "Enter up to two decimal places.",
      (value) => value == null || Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
    );

export function createDocumentReviewSchema(
  includesTrainingHours: boolean,
  includesTotalUnits: boolean,
) {
  const trainingHours = confirmedMetric();
  const totalUnits = confirmedMetric();

  return yup.object({
    status: yup
      .mixed<(typeof DOCUMENT_REVIEW_STATUSES)[number]>()
      .oneOf([...DOCUMENT_REVIEW_STATUSES], "Choose a review status.")
      .required("Choose a review status."),
    remarks: yup.string().trim().max(2000, "Remarks must be 2,000 characters or fewer.").defined(),
    confirmedTrainingHours: includesTrainingHours
      ? trainingHours.when("status", {
          is: "VERIFIED",
          then: (schema) =>
            schema.required("Confirm the training hours from the document."),
        })
      : trainingHours,
    confirmedTotalUnits: includesTotalUnits
      ? totalUnits.when("status", {
          is: "VERIFIED",
          then: (schema) =>
            schema.required("Confirm the transcript units from the document."),
        })
      : totalUnits,
  });
}

export type DocumentReviewValues = yup.InferType<
  ReturnType<typeof createDocumentReviewSchema>
>;
