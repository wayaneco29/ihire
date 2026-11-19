import * as yup from "yup";

export type ChangePasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  verificationCode: string;
};

export function createChangePasswordSchema(requiresVerification: boolean) {
  return yup.object({
    currentPassword: yup.string().required("Enter your current password."),
    newPassword: yup
      .string()
      .min(8, "Use at least 8 characters.")
      .notOneOf([yup.ref("currentPassword")], "Choose a different password.")
      .required("Enter a new password."),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref("newPassword")], "Passwords must match.")
      .required("Confirm your new password."),
    verificationCode: yup
      .string()
      .trim()
      .defined()
      .test(
        "required-for-reauthentication",
        "Enter the verification code.",
        (value) => !requiresVerification || Boolean(value),
      ),
  });
}
