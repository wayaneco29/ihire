import * as yup from "yup";

export const signupCodeSchema = yup.object({
  code: yup.string().matches(/^\d{6}$/, "Enter the six-digit code.").required("Enter the verification code."),
});

export const registerSchema = yup.object({
  email: yup
    .string()
    .trim()
    .lowercase()
    .email("Enter a valid email address.")
    .required("Email is required."),
  phoneNumber: yup
    .string()
    .matches(/^9\d{9}$/, "Enter 10 digits starting with 9 after +63.")
    .required("A Philippine mobile number is required."),
  password: yup
    .string()
    .min(8, "Use at least 8 characters.")
    .required("Password is required."),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords must match.")
    .required("Confirm your password."),
});

export type RegisterValues = yup.InferType<typeof registerSchema>;
