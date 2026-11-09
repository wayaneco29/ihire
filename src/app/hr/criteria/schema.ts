import * as yup from "yup";

export const POSITION_TRACKS = ["TEACHING", "NON_TEACHING"] as const;

export const positionSchema = yup.object({
  track: yup
    .mixed<(typeof POSITION_TRACKS)[number]>()
    .oneOf(POSITION_TRACKS, "Choose a position track.")
    .required("Choose a position track."),
  title: yup
    .string()
    .trim()
    .min(2, "Enter at least 2 characters.")
    .max(160, "Position titles must be 160 characters or fewer.")
    .required("Enter a position title."),
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

export type PositionValues = yup.InferType<typeof positionSchema>;
export type PositionWeightValues = yup.InferType<
  typeof positionWeightFormSchema
>;
