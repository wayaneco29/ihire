"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Alert, Modal } from "antd";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { FormInput } from "@/components/form";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import {
  createChangePasswordSchema,
  type ChangePasswordFormValues,
} from "./change-password-schema";

type AccountSecurityContextValue = {
  openChangePassword: () => void;
};

const AccountSecurityContext =
  createContext<AccountSecurityContextValue | null>(null);

const DEFAULT_VALUES: ChangePasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
  verificationCode: "",
};

export function AccountSecurityProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const openChangePassword = useCallback(() => setDialogOpen(true), []);
  const closeChangePassword = useCallback(() => setDialogOpen(false), []);
  const contextValue = useMemo(
    () => ({ openChangePassword }),
    [openChangePassword],
  );

  return (
    <AccountSecurityContext.Provider value={contextValue}>
      {children}
      <ChangePasswordDialog onClose={closeChangePassword} open={dialogOpen} />
    </AccountSecurityContext.Provider>
  );
}

export function useAccountSecurity() {
  const context = useContext(AccountSecurityContext);
  if (!context) {
    throw new Error(
      "useAccountSecurity must be used inside AccountSecurityProvider",
    );
  }
  return context;
}

function ChangePasswordDialog({
  onClose,
  open,
}: {
  onClose: () => void;
  open: boolean;
}) {
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(
    null,
  );
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const resolver = useMemo(
    () => yupResolver(createChangePasswordSchema(requiresVerification)),
    [requiresVerification],
  );
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver,
    defaultValues: DEFAULT_VALUES,
  });

  function resetDialog() {
    setRequiresVerification(false);
    setFormError(null);
    setVerificationMessage(null);
    setPasswordUpdated(false);
    reset(DEFAULT_VALUES);
  }

  function handleOpenChange(openState: boolean) {
    if (!openState && !isSubmitting) {
      resetDialog();
      onClose();
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setVerificationMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        current_password: values.currentPassword,
        password: values.newPassword,
        ...(requiresVerification
          ? { nonce: values.verificationCode.trim() }
          : {}),
      });

      if (error?.code === "reauthentication_needed" && !requiresVerification) {
        const { error: reauthenticationError } =
          await supabase.auth.reauthenticate();
        if (reauthenticationError) {
          setFormError(
            "We could not send a verification code. Please try again.",
          );
          return;
        }

        setRequiresVerification(true);
        setVerificationMessage(
          "A verification code was sent to your verified email or phone. Enter it to finish changing your password.",
        );
        return;
      }

      if (error) {
        setFormError(
          error.code === "invalid_credentials"
            ? "Your current password is incorrect."
            : error.code === "weak_password"
              ? "Choose a stronger password that meets the account requirements."
              : error.code === "reauthentication_not_valid"
                ? "That verification code is invalid or expired. Request a new code by closing and reopening this dialog."
                : "We could not update your password. Check your details and try again.",
        );
        return;
      }

      reset(DEFAULT_VALUES);
      setPasswordUpdated(true);
    } catch {
      setFormError(
        "A connection problem prevented the password update. Try again.",
      );
    }
  });

  return (
    <Modal
      centered
      closable={!isSubmitting}
      footer={null}
      keyboard={!isSubmitting}
      maskClosable={!isSubmitting}
      onCancel={() => handleOpenChange(false)}
      open={open}
      title="Change password"
    >
      {passwordUpdated ? (
        <div className="space-y-5 pt-2">
          <Alert
            message="Your password has been updated."
            description="Use your new password the next time you sign in."
            showIcon
            type="success"
          />
          <div className="flex justify-end">
            <Button onClick={() => handleOpenChange(false)} variant="filled">
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form className="mt-2" onSubmit={onSubmit}>
          <p className="mb-4 text-sm leading-6 text-muted">
            Confirm your current password, then choose a new one.
          </p>
          {formError && (
            <Alert className="mb-4" message={formError} showIcon type="error" />
          )}
          {verificationMessage && (
            <Alert
              className="mb-4"
              message={verificationMessage}
              showIcon
              type="info"
            />
          )}
          <div className="space-y-3">
            <FormInput
              autoComplete="current-password"
              control={control}
              label="Current password"
              name="currentPassword"
              required
              type="password"
            />
            <FormInput
              autoComplete="new-password"
              control={control}
              label="New password"
              name="newPassword"
              required
              type="password"
            />
            <FormInput
              autoComplete="new-password"
              control={control}
              label="Confirm new password"
              name="confirmPassword"
              required
              type="password"
            />
            {requiresVerification && (
              <FormInput
                autoComplete="one-time-code"
                control={control}
                hint="Check the verified email or phone linked to your account."
                label="Verification code"
                name="verificationCode"
                required
              />
            )}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
              variant="bordered"
            >
              Cancel
            </Button>
            <Button loading={isSubmitting} type="submit" variant="filled">
              {requiresVerification ? "Verify and update" : "Update password"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
