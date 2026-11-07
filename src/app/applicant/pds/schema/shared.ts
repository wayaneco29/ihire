import dayjs, { type Dayjs } from "dayjs";
import * as yup from "yup";

export const optionalText = () =>
  yup
    .string()
    .transform((value, originalValue) =>
      typeof originalValue === "string" && !originalValue.trim()
        ? null
        : value?.trim(),
    )
    .nullable();

export const pdsDateSchema = yup
  .mixed<Dayjs | string>()
  .required("Date is required.")
  .test("valid-date", "Enter a valid date.", (value) =>
    Boolean(value && dayjs(value).isValid()),
  );

export const optionalPdsDateSchema = yup
  .mixed<Dayjs | string>()
  .transform((value, originalValue) => (originalValue === "" ? null : value))
  .nullable()
  .test(
    "valid-optional-date",
    "Enter a valid date.",
    (value) => value == null || dayjs(value).isValid(),
  );

export const optionalEducationYear = () =>
  yup
    .number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? null : value,
    )
    .nullable()
    .integer("Enter a whole year.")
    .min(1900, "Enter a year from 1900 onward.")
    .max(new Date().getFullYear(), "A year cannot be in the future.");

export const PDS_QUESTION_CODES = [
  "34A",
  "34B",
  "35A",
  "35B",
  "36",
  "37",
  "38A",
  "38B",
  "39",
  "40A",
  "40B",
  "40C",
] as const;

export const QUESTION_CODES_WITH_DETAILS = [
  "34A",
  "34B",
  "35A",
  "35B",
  "36",
  "37",
  "38A",
  "38B",
  "40A",
] as const;

