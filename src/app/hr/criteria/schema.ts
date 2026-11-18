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

export const positionTitleFormSchema = yup.object({
  title: positionTitleSchema,
});

export const positionActiveSchema = yup.object({
  isActive: yup.boolean().required(),
});

export const positionWeightsSchema = yup
  .array()
  .of(
    yup
      .number()
      .transform((value, original) =>
        original === "" ? Number.NaN : value,
      )
      .min(0, "Weights cannot be negative.")
      .max(100, "A criterion cannot exceed 100 points.")
      .test(
        "two-decimal-places",
        "Use up to two decimal places.",
        (value) =>
          value == null ||
          Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
      )
      .required("Enter a point weight for every criterion."),
  )
  .min(1, "Add at least one criterion weight.")
  .required("Add a point weight for every criterion.")
  .test(
    "total-100",
    "The total weight must equal 100 points.",
    (weights) =>
      Array.isArray(weights) &&
      weights.length > 0 &&
      weights.every(Number.isFinite) &&
      Math.round(weights.reduce((total, weight) => total + weight, 0) * 100) ===
        10000,
  );

export const positionWeightFormSchema = yup.object({
  weights: positionWeightsSchema,
});

export const positionScoringStandardsSchema = yup.object({
  baseQualificationLevel: yup
    .string()
    .defined()
    .test(
      "valid-qualification-level",
      "Choose a valid education standard.",
      (value) =>
        value === "" ||
        (/^\d+$/.test(value) &&
          Number(value) >= 1 &&
          Number(value) <= 31),
    ),
  baseTrainingIncrementLevel: yup
    .string()
    .defined()
    .test(
      "valid-training-increment-level",
      "Choose a valid minimum training increment level.",
      (value) =>
        value === "" ||
        (/^\d+$/.test(value) &&
          Number(value) >= 1 &&
          Number(value) <= 31),
    ),
  baseExperienceIncrementLevel: yup
    .string()
    .defined()
    .test(
      "valid-experience-increment-level",
      "Choose a valid minimum Experience increment level.",
      (value) =>
        value === "" ||
        (/^\d+$/.test(value) &&
          Number(value) >= 1 &&
          Number(value) <= 31),
    ),
});

export type PositionValues = yup.InferType<typeof positionSchema>;
export type PositionTitleFormValues = yup.InferType<
  typeof positionTitleFormSchema
>;
export type PositionActiveValues = yup.InferType<typeof positionActiveSchema>;
export type PositionWeightValues = yup.InferType<
  typeof positionWeightFormSchema
>;
export type PositionScoringStandardsValues = yup.InferType<
  typeof positionScoringStandardsSchema
>;
