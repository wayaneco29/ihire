import * as yup from "yup";

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
