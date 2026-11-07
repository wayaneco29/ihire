import * as yup from "yup";
import type { UploadFile } from "antd";

export const documentUploadSchema = yup.object({
  files: yup
    .array()
    .of(yup.mixed<UploadFile>().required())
    .min(1, "Choose a document file.")
    .required("Choose a document file."),
});

export type DocumentUploadValues = yup.InferType<typeof documentUploadSchema>;
