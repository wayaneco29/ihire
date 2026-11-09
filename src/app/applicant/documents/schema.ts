import * as yup from "yup";
import type { UploadFile } from "antd";

export const documentUploadSchema = yup.object({
  files: yup
    .array()
    .of(yup.mixed<UploadFile>().required())
    .min(1, "Choose a document file.")
    .required("Choose a document file."),
  trainingHours: yup
    .number()
    .transform((value, originalValue) => originalValue === "" ? null : value)
    .nullable()
    .optional()
    .min(0, "Hours cannot be negative.")
    .max(999999.99, "Enter no more than 999,999.99 hours.")
    .test(
      "two-decimal-places",
      "Enter up to two decimal places.",
      (value) => value == null || Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
    ),
  totalUnits: yup
    .number()
    .transform((value, originalValue) => originalValue === "" ? null : value)
    .nullable()
    .optional()
    .min(0, "Units cannot be negative.")
    .max(99999999.99, "Enter no more than 99,999,999.99 units.")
    .test(
      "two-decimal-places",
      "Enter up to two decimal places.",
      (value) => value == null || Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
    ),
  pdsLearningDevelopmentId: yup.string().optional(),
  pdsEducationId: yup.string().optional(),
});

export type DocumentUploadValues = yup.InferType<typeof documentUploadSchema>;
