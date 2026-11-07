import * as yup from "yup";

export const DOCUMENT_REVIEW_STATUSES = [
  "VERIFIED",
  "REJECTED",
  "FOR_RESUBMISSION",
] as const;

export const documentReviewSchema = yup.object({
  status: yup
    .mixed<(typeof DOCUMENT_REVIEW_STATUSES)[number]>()
    .oneOf([...DOCUMENT_REVIEW_STATUSES], "Choose a review status.")
    .required("Choose a review status."),
  remarks: yup.string().trim().max(2000, "Remarks must be 2,000 characters or fewer.").defined(),
});

export type DocumentReviewValues = yup.InferType<typeof documentReviewSchema>;
