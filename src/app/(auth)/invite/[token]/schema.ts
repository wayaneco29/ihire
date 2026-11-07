import * as yup from "yup";

export const acceptInviteSchema = yup.object({
  password: yup
    .string()
    .min(8, "Use at least 8 characters.")
    .required("Password is required."),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords must match.")
    .required("Confirm your password."),
});

export type AcceptInviteValues = yup.InferType<typeof acceptInviteSchema>;
