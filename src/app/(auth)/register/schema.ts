import * as yup from "yup";

export const registerSchema = yup.object({
  email: yup
    .string()
    .trim()
    .lowercase()
    .email("Enter a valid email address.")
    .required("Email is required."),
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
