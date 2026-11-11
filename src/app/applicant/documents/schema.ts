import * as yup from "yup";
import type { UploadFile } from "antd";
import { EDUCATION_LEVEL_OPTIONS } from "@/constants/pds-options";

const documentUploadSchemaBase = yup.object({
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
  certificateType: yup
    .string()
    .trim()
    .max(200, "Certificate type must be 200 characters or fewer.")
    .optional(),
  certificateIssuer: yup
    .string()
    .trim()
    .max(500, "Issuer must be 500 characters or fewer.")
    .optional(),
  certificateDate: yup
    .string()
    .nullable()
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Choose a valid certificate date.",
      excludeEmptyString: true,
    }),
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
  currentHighestEducationLevel: yup.string().optional(),
});

export const documentUploadSchema = (
  isTrainingCertificate: boolean,
  isTranscript: boolean,
) =>
  documentUploadSchemaBase.shape({
    certificateTitle: isTrainingCertificate
      ? yup
          .string()
          .trim()
          .required("Enter the certificate title.")
          .max(200, "Certificate titles must be 200 characters or fewer.")
      : yup.string().optional(),
    currentHighestEducationLevel: isTranscript
      ? yup
          .string()
          .oneOf(
            EDUCATION_LEVEL_OPTIONS.map(({ value }) => value),
            "Choose your current highest educational attainment.",
          )
          .required("Choose your current highest educational attainment.")
      : yup.string().optional(),
  });

export type DocumentUploadValues = yup.InferType<
  ReturnType<typeof documentUploadSchema>
>;
