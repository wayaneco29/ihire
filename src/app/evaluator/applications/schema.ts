import * as yup from "yup";

export const APPLICATION_EVALUATION_RESULTS = [
  "QUALIFIED",
  "NOT_QUALIFIED",
] as const;

export const applicationEvaluationSchema = yup.object({
  result: yup
    .mixed<(typeof APPLICATION_EVALUATION_RESULTS)[number]>()
    .oneOf([...APPLICATION_EVALUATION_RESULTS], "Choose an evaluation result.")
    .required("Choose an evaluation result."),
  remarks: yup.string().trim().max(2000, "Remarks must be 2,000 characters or fewer.").defined(),
});

export type ApplicationEvaluationValues = yup.InferType<typeof applicationEvaluationSchema>;
