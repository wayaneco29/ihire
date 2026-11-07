import * as yup from "yup";

export const invitationSchema = yup.object({
  email: yup
    .string()
    .trim()
    .lowercase()
    .email("Enter a valid email address.")
    .required("Email is required."),
  role: yup
    .mixed<"HR" | "EVALUATOR">()
    .oneOf(["HR", "EVALUATOR"], "Choose an invitation role.")
    .required("Role is required."),
});

export type InvitationValues = yup.InferType<typeof invitationSchema>;
