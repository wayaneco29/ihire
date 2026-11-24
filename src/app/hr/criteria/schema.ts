import * as yup from "yup";

export const POSITION_APPLICATION_TYPES = ["TEACHING", "NON_TEACHING"] as const;

const positionTitleSchema = yup
  .string()
  .trim()
  .min(2, "Enter at least 2 characters.")
  .max(160, "Position titles must be 160 characters or fewer.")
  .required("Enter a position title.");

export const positionSchema = yup.object({
  applicationType: yup
    .mixed<(typeof POSITION_APPLICATION_TYPES)[number]>()
    .oneOf(POSITION_APPLICATION_TYPES, "Choose an application type.")
    .required("Choose an application type."),
  title: positionTitleSchema,
});

export type PositionValues = yup.InferType<typeof positionSchema>;
