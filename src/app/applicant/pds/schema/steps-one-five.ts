import dayjs, { type Dayjs } from "dayjs";
import * as yup from "yup";
import {
  optionalEducationYear,
  optionalPdsDateSchema,
  optionalText,
  pdsDateSchema,
} from "./shared";

const addressSchema = yup.object({
  house_block_lot_no: optionalText(),
  street: optionalText(),
  subdivision_village: optionalText(),
  barangay: yup.string().trim().required("Barangay is required."),
  city_municipality: yup.string().trim().required("City or municipality is required."),
  province: yup.string().trim().required("Province is required."),
  zip_code: yup.string().trim().required("ZIP code is required."),
});

export const pdsStepOneSchema = yup.object({
  personalInfo: yup
    .object({
      surname: yup.string().trim().required("Surname is required."),
      first_name: yup.string().trim().required("First name is required."),
      middle_name: optionalText(),
      name_extension: optionalText(),
      date_of_birth: pdsDateSchema,
      place_of_birth: yup.string().trim().required("Place of birth is required."),
      sex_at_birth: yup
        .mixed<"MALE" | "FEMALE">()
        .oneOf(["MALE", "FEMALE"], "Choose a sex at birth.")
        .required("Sex at birth is required."),
      civil_status: yup
        .mixed<"SINGLE" | "MARRIED" | "WIDOWED" | "SEPARATED" | "SOLO_PARENT" | "OTHER">()
        .oneOf(
          ["SINGLE", "MARRIED", "WIDOWED", "SEPARATED", "SOLO_PARENT", "OTHER"],
          "Choose a civil status.",
        )
        .required("Civil status is required."),
      civil_status_other: optionalText().when("civil_status", {
        is: "OTHER",
        then: (schema) => schema.required("Please specify your civil status."),
        otherwise: (schema) => schema.transform(() => null),
      }),
      height_m: yup
        .number()
        .transform((value, originalValue) =>
          originalValue === "" || originalValue == null ? null : value,
        )
        .nullable()
        .positive("Height must be greater than zero."),
      weight_kg: yup
        .number()
        .transform((value, originalValue) =>
          originalValue === "" || originalValue == null ? null : value,
        )
        .nullable()
        .positive("Weight must be greater than zero."),
      blood_type: yup
        .string()
        .oneOf(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""])
        .transform((value) => value || null)
        .nullable(),
      umid_no: optionalText(),
      pagibig_no: optionalText(),
      philhealth_no: optionalText(),
      philsys_no: optionalText(),
      tin_no: optionalText(),
      agency_employee_no: optionalText(),
      citizenship: yup
        .mixed<"FILIPINO" | "DUAL">()
        .oneOf(["FILIPINO", "DUAL"], "Choose a citizenship option.")
        .required("Citizenship is required."),
      dual_citizenship_by: optionalText().when("citizenship", {
        is: "DUAL",
        then: (schema) =>
          schema
            .oneOf(["BY_BIRTH", "BY_NATURALIZATION"])
            .required("Choose how dual citizenship was acquired."),
        otherwise: (schema) => schema.transform(() => null),
      }),
      dual_citizenship_country: optionalText().when("citizenship", {
        is: "DUAL",
        then: (schema) => schema.required("Choose the other country."),
        otherwise: (schema) => schema.transform(() => null),
      }),
      telephone_no: optionalText(),
      mobile_no: optionalText(),
      email: yup
        .string()
        .trim()
        .lowercase()
        .email("Enter a valid email address.")
        .required("Email is required."),
    })
    .required(),
  addresses: yup
    .object({
      residential: addressSchema.required(),
      permanent: addressSchema.required(),
      sameAsResidential: yup.boolean().required(),
    })
    .required(),
});

export const pdsStepTwoSchema = yup.object({
  familyBackground: yup
    .object({
      spouse_surname: optionalText(),
      spouse_first_name: optionalText(),
      spouse_middle_name: optionalText(),
      spouse_name_extension: optionalText(),
      spouse_occupation: optionalText(),
      spouse_employer: optionalText(),
      spouse_business_address: optionalText(),
      spouse_telephone_no: optionalText(),
      father_surname: optionalText(),
      father_first_name: optionalText(),
      father_middle_name: optionalText(),
      father_name_extension: optionalText(),
      mother_surname: optionalText(),
      mother_first_name: optionalText(),
      mother_middle_name: optionalText(),
    })
    .required(),
  children: yup
    .array()
    .of(
      yup
        .object({
          full_name: yup.string().trim().required("Child's name is required."),
          date_of_birth: optionalPdsDateSchema,
        })
        .required(),
    )
    .max(100, "Add no more than 100 children.")
    .required(),
});

export const pdsStepThreeSchema = yup.object({
  education: yup
    .array()
    .of(
      yup
        .object({
          level: yup
            .mixed<
              | "ELEMENTARY"
              | "SECONDARY"
              | "VOCATIONAL_TRADE"
              | "COLLEGE"
              | "GRADUATE_STUDIES"
            >()
            .oneOf(
              [
                "ELEMENTARY",
                "SECONDARY",
                "VOCATIONAL_TRADE",
                "COLLEGE",
                "GRADUATE_STUDIES",
              ],
              "Choose an education level.",
            )
            .required("Education level is required."),
          graduate_degree_type: yup
            .mixed<"MASTERS" | "DOCTORATE">()
            .oneOf(["MASTERS", "DOCTORATE"])
            .nullable()
            .when("level", {
              is: "GRADUATE_STUDIES",
              then: (schema) =>
                schema.required("Choose a graduate degree type."),
            }),
          graduate_degree_completed: yup
            .boolean()
            .nullable()
            .when("level", {
              is: "GRADUATE_STUDIES",
              then: (schema) =>
                schema.required("Indicate whether you completed the degree."),
            }),
          graduate_units_earned: yup
            .number()
            .transform((value, originalValue) =>
              originalValue === "" || originalValue == null ? null : value,
            )
            .nullable()
            .integer()
            .min(0)
            .when(["level", "graduate_degree_completed"], {
              is: (level: string, completed: boolean | null) =>
                level === "GRADUATE_STUDIES" && completed === false,
              then: (schema) =>
                schema.required("Enter your current units earned."),
            }),
          school_name: optionalText(),
          degree_course: optionalText(),
          period_from: optionalEducationYear(),
          period_to: optionalEducationYear().test(
            "period-order",
            "End year must be the same as or later than the start year.",
            function (value) {
              return (
                value == null ||
                this.parent.period_from == null ||
                value >= this.parent.period_from
              );
            },
          ),
          highest_level_units_earned: optionalText(),
          year_graduated: optionalEducationYear(),
          honors_received: optionalText(),
        })
        .required(),
    )
    .min(1, "Add at least one education level.")
    .max(5, "Add no more than five education levels.")
    .test("unique-levels", "Each education level can only be added once.", (rows) => {
      const levels = (rows ?? []).map((row) => row.level);
      return new Set(levels).size === levels.length;
    })
    .required(),
});

export const pdsStepFourSchema = yup.object({
  eligibility: yup
    .array()
    .of(
      yup
        .object({
          eligibility_name: yup.string().trim().required("Eligibility name is required."),
          rating: yup
            .number()
            .transform((value, originalValue) =>
              originalValue === "" || originalValue == null ? null : value,
            )
            .nullable()
            .min(0, "Rating cannot be below zero.")
            .max(100, "Rating cannot exceed 100."),
          exam_date: optionalPdsDateSchema,
          exam_place: optionalText(),
          license_no: optionalText(),
          license_valid_until: optionalPdsDateSchema,
        })
        .required(),
    )
    .max(100, "Add no more than 100 eligibility records.")
    .required(),
});

export const pdsStepFiveSchema = yup.object({
  workExperience: yup
    .array()
    .of(
      yup
        .object({
          date_from: pdsDateSchema,
          date_to: optionalPdsDateSchema.test(
            "date-order",
            "End date must be the same as or later than the start date.",
            function (value) {
              return (
                value == null ||
                !this.parent.date_from ||
                dayjs(value).isAfter(dayjs(this.parent.date_from), "day") ||
                dayjs(value).isSame(dayjs(this.parent.date_from), "day")
              );
            },
          ),
          position_title: yup.string().trim().required("Position title is required."),
          agency_company: yup.string().trim().required("Agency / company is required."),
          monthly_salary: yup
            .number()
            .transform((value, originalValue) =>
              originalValue === "" || originalValue == null ? null : value,
            )
            .nullable()
            .min(0, "Salary cannot be negative."),
          salary_grade_step: optionalText(),
          appointment_status: yup
            .string()
            .oneOf([
              "Permanent",
              "Temporary",
              "Casual",
              "Contractual",
              "Coterminous",
              "Job Order",
              "Other",
              "",
            ])
            .transform((value) => value || null)
            .nullable(),
          appointment_status_other: optionalText().when("appointment_status", {
            is: "Other",
            then: (schema) =>
              schema.required("Please specify the appointment status."),
            otherwise: (schema) => schema.transform(() => null),
          }),
          is_gov_service: yup
            .boolean()
            .nullable()
            .required("Choose whether this was government service."),
          duties_description: optionalText(),
        })
        .required(),
    )
    .max(100, "Add no more than 100 work experiences.")
    .required(),
});

export type PdsStepOneValues = {
  personalInfo: {
    surname: string;
    first_name: string;
    middle_name: string;
    name_extension: string;
    date_of_birth: Dayjs | string | null;
    place_of_birth: string;
    sex_at_birth: "MALE" | "FEMALE" | "";
    civil_status:
      | "SINGLE"
      | "MARRIED"
      | "WIDOWED"
      | "SEPARATED"
      | "SOLO_PARENT"
      | "OTHER"
      | "";
    civil_status_other: string;
    height_m: number | null;
    weight_kg: number | null;
    blood_type: string;
    umid_no: string;
    pagibig_no: string;
    philhealth_no: string;
    philsys_no: string;
    tin_no: string;
    agency_employee_no: string;
    citizenship: "FILIPINO" | "DUAL" | "";
    dual_citizenship_by: "BY_BIRTH" | "BY_NATURALIZATION" | "";
    dual_citizenship_country: string;
    telephone_no: string;
    mobile_no: string;
    email: string;
  };
  addresses: {
    residential: PdsAddressValues;
    permanent: PdsAddressValues;
    sameAsResidential: boolean;
  };
};

export type PdsAddressValues = {
  house_block_lot_no: string;
  street: string;
  subdivision_village: string;
  barangay: string;
  city_municipality: string;
  province: string;
  zip_code: string;
};

export type PdsStepTwoValues = {
  familyBackground: {
    spouse_surname: string;
    spouse_first_name: string;
    spouse_middle_name: string;
    spouse_name_extension: string;
    spouse_occupation: string;
    spouse_employer: string;
    spouse_business_address: string;
    spouse_telephone_no: string;
    father_surname: string;
    father_first_name: string;
    father_middle_name: string;
    father_name_extension: string;
    mother_surname: string;
    mother_first_name: string;
    mother_middle_name: string;
  };
  children: { full_name: string; date_of_birth: Dayjs | string | null }[];
};

export type PdsStepThreeValues = {
  education: {
    level:
      | "ELEMENTARY"
      | "SECONDARY"
      | "VOCATIONAL_TRADE"
      | "COLLEGE"
      | "GRADUATE_STUDIES"
      | "";
    graduate_degree_type: "MASTERS" | "DOCTORATE" | null;
    graduate_degree_completed: boolean | null;
    graduate_units_earned: number | null;
    school_name: string;
    degree_course: string;
    period_from: number | null;
    period_to: number | null;
    highest_level_units_earned: string;
    year_graduated: number | null;
    honors_received: string;
  }[];
};

export type PdsStepFourValues = {
  eligibility: {
    eligibility_name: string;
    rating: number | null;
    exam_date: Dayjs | string | null;
    exam_place: string;
    license_no: string;
    license_valid_until: Dayjs | string | null;
  }[];
};

export type PdsStepFiveValues = {
  workExperience: {
    date_from: Dayjs | string | null;
    date_to: Dayjs | string | null;
    position_title: string;
    agency_company: string;
    monthly_salary: number | null;
    salary_grade_step: string;
    appointment_status: string;
    appointment_status_other: string;
    is_gov_service: boolean | null;
    duties_description: string;
  }[];
};
