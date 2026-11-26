import * as yup from "yup";

export const loginOtpSchema = yup.object({
  code: yup.string().matches(/^\d{6}$/, "Enter the six-digit code.").required("Enter the verification code."),
});

export const phoneEnrollmentSchema = yup.object({
  phoneInput: yup.string().matches(/^9\d{9}$/, "Enter 10 digits starting with 9 after +63.").required("A Philippine mobile number is required."),
});

export const loginSchema = yup.object({
  email: yup
    .string()
    .trim()
    .lowercase()
    .email("Enter a valid email address.")
    .required("Email is required."),
  password: yup.string().required("Password is required."),
});

export type LoginValues = yup.InferType<typeof loginSchema>;
