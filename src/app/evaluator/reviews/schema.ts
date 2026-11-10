import * as yup from "yup";

export const applicantNumberLookupSchema = yup.object({
  applicantNumber: yup
    .string()
    .trim()
    .transform((value) => value.toLocaleUpperCase())
    .required("Enter an applicant number.")
    .matches(/^APP-\d{4,}$/, "Enter an applicant number such as APP-0001."),
});

export type ApplicantNumberLookupValues = yup.InferType<
  typeof applicantNumberLookupSchema
>;
