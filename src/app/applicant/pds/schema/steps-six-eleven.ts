import dayjs, { type Dayjs } from "dayjs";
import * as yup from "yup";
import {
  optionalPdsDateSchema,
  optionalText,
  PDS_QUESTION_CODES,
  QUESTION_CODES_WITH_DETAILS,
} from "./shared";

export const pdsStepSixSchema = yup.object({
  voluntaryWork: yup
    .array()
    .of(
      yup
        .object({
          organization_name_address: yup
            .string()
            .trim()
            .required("Organization name and address are required."),
          date_from: optionalPdsDateSchema,
          date_to: optionalPdsDateSchema.test(
            "date-order",
            "End date must be the same as or later than the start date.",
            function (value) {
              return (
                value == null ||
                this.parent.date_from == null ||
                dayjs(value).isAfter(dayjs(this.parent.date_from), "day") ||
                dayjs(value).isSame(dayjs(this.parent.date_from), "day")
              );
            },
          ),
          hours: yup
            .number()
            .transform((value, originalValue) =>
              originalValue === "" || originalValue == null ? null : value,
            )
            .nullable()
            .min(0, "Hours cannot be negative."),
          position_nature: optionalText(),
        })
        .required(),
    )
    .max(100, "Add no more than 100 voluntary work entries.")
    .required(),
});

export const pdsStepSevenSchema = yup.object({
  learningDevelopment: yup
    .array()
    .of(
      yup
        .object({
          title: yup.string().trim().required("Training title is required."),
          date_from: optionalPdsDateSchema,
          date_to: optionalPdsDateSchema.test(
            "date-order",
            "End date must be the same as or later than the start date.",
            function (value) {
              return (
                value == null ||
                this.parent.date_from == null ||
                dayjs(value).isAfter(dayjs(this.parent.date_from), "day") ||
                dayjs(value).isSame(dayjs(this.parent.date_from), "day")
              );
            },
          ),
          hours: yup
            .number()
            .transform((value, originalValue) =>
              originalValue === "" || originalValue == null ? null : value,
            )
            .nullable()
            .min(0, "Training hours cannot be negative."),
          ld_type: yup
            .string()
            .oneOf(["Managerial", "Supervisory", "Technical", "Other", ""])
            .transform((value) => value || null)
            .nullable(),
          ld_type_other: optionalText().when("ld_type", {
            is: "Other",
            then: (schema) => schema.required("Please specify the training type."),
            otherwise: (schema) => schema.transform(() => null),
          }),
          conducted_by: optionalText(),
        })
        .required(),
    )
    .max(100, "Add no more than 100 training entries.")
    .required(),
});

export const pdsStepEightSchema = yup.object({
  otherInfo: yup
    .array()
    .of(
      yup
        .object({
          category: yup
            .mixed<"SKILL_HOBBY" | "RECOGNITION" | "MEMBERSHIP">()
            .oneOf(
              ["SKILL_HOBBY", "RECOGNITION", "MEMBERSHIP"],
              "Choose a category.",
            )
            .required("Category is required."),
          description: yup.string().trim().required("Enter a description."),
        })
        .required(),
    )
    .max(100, "Add no more than 100 entries.")
    .required(),
});

export const pdsStepNineSchema = yup.object({
  questionnaire: yup
    .array()
    .of(
      yup
        .object({
          question_code: yup
            .mixed<(typeof PDS_QUESTION_CODES)[number]>()
            .oneOf(PDS_QUESTION_CODES)
            .required(),
          answer: yup
            .boolean()
            .nullable()
            .required("Choose Yes or No for each question."),
          details: optionalText().test(
            "details-required-when-yes",
            "Please provide the requested details.",
            function (value) {
              const { answer, question_code } = this.parent;
              return (
                answer !== true ||
                !(QUESTION_CODES_WITH_DETAILS as readonly string[]).includes(
                  question_code,
                ) ||
                Boolean(value?.trim())
              );
            },
          ),
          country: optionalText().test(
            "country-required-when-yes",
            "Choose the country.",
            function (value) {
              return (
                this.parent.answer !== true ||
                this.parent.question_code !== "39" ||
                Boolean(value?.trim())
              );
            },
          ),
          date_filed: optionalPdsDateSchema.test(
            "date-filed-required-when-yes",
            "Date filed is required for this answer.",
            function (value) {
              return (
                this.parent.answer !== true ||
                this.parent.question_code !== "35B" ||
                value != null
              );
            },
          ),
          case_status: optionalText().test(
            "case-status-required-when-yes",
            "Case status is required for this answer.",
            function (value) {
              return (
                this.parent.answer !== true ||
                this.parent.question_code !== "35B" ||
                Boolean(value?.trim())
              );
            },
          ),
          id_no: optionalText().test(
            "id-required-when-yes",
            "ID number is required for this answer.",
            function (value) {
              return (
                this.parent.answer !== true ||
                !["40B", "40C"].includes(this.parent.question_code) ||
                Boolean(value?.trim())
              );
            },
          ),
        })
        .required(),
    )
    .length(12, "Answer all 12 questionnaire items.")
    .test("all-question-codes", "Answer every questionnaire item once.", (rows) => {
      const codes = (rows ?? []).map((row) => row.question_code);
      return new Set(codes).size === 12;
    })
    .required(),
});

export const pdsStepTenSchema = yup.object({
  references: yup
    .array()
    .of(
      yup
        .object({
          name: yup.string().trim().required("Reference name is required."),
          address: yup.string().trim().required("Reference address is required."),
          contact: yup
            .string()
            .trim()
            .required("Enter a phone number and/or email address."),
        })
        .required(),
    )
    .length(3, "Enter exactly three references.")
    .required(),
  confirm_unrelated: yup
    .boolean()
    .oneOf([true], "Confirm that these references are not related to you.")
    .required(),
});

export const pdsStepElevenSchema = yup.object({
  confirm_reviewed: yup
    .boolean()
    .oneOf([true], "Confirm that you reviewed this PDS before submitting.")
    .required(),
});

export type PdsStepSixValues = {
  voluntaryWork: {
    organization_name_address: string;
    date_from: Dayjs | string | null;
    date_to: Dayjs | string | null;
    hours: number | null;
    position_nature: string;
  }[];
};

export type PdsStepSevenValues = {
  learningDevelopment: {
    title: string;
    date_from: Dayjs | string | null;
    date_to: Dayjs | string | null;
    hours: number | null;
    ld_type: string;
    ld_type_other: string;
    conducted_by: string;
  }[];
};

export type PdsStepEightValues = {
  otherInfo: {
    category: "SKILL_HOBBY" | "RECOGNITION" | "MEMBERSHIP" | "";
    description: string;
  }[];
};

export type PdsQuestionCode = (typeof PDS_QUESTION_CODES)[number];

export type PdsStepNineValues = {
  questionnaire: {
    question_code: PdsQuestionCode;
    answer: boolean | null;
    details: string;
    country: string;
    date_filed: Dayjs | string | null;
    case_status: string;
    id_no: string;
  }[];
};

export type PdsStepTenValues = {
  references: { name: string; address: string; contact: string }[];
  confirm_unrelated: boolean;
};

export type PdsStepElevenValues = {
  confirm_reviewed: boolean;
};
