"use server";

import { revalidatePath } from "next/cache";
import { ValidationError } from "yup";
import type { User } from "@supabase/supabase-js";
import { acceptInviteSchema } from "./schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { invitationTokenHash } from "@/lib/invitations";

type AcceptResult = { success: boolean; message: string };
type InvitationIdentity = { id: string; email: string; role: string };

async function findUserCreatedForInvitation(
  admin: ReturnType<typeof createAdminClient>,
  invitation: InvitationIdentity,
): Promise<User | null> {
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("email", invitation.email)
    .maybeSingle();

  if (profileError || !profile || profile.role !== invitation.role) return null;

  const { data, error } = await admin.auth.admin.getUserById(profile.id);
  const user = data.user;
  if (
    error ||
    !user ||
    user.email?.trim().toLowerCase() !== invitation.email ||
    user.app_metadata.invitation_id !== invitation.id ||
    user.app_metadata.role !== invitation.role
  ) {
    return null;
  }

  return user;
}

export async function acceptInvitation(
  token: string,
  values: unknown,
): Promise<AcceptResult> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return { success: false, message: "This invitation is unavailable or expired." };
  }

  let input;
  try {
    input = await acceptInviteSchema.validate(values, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ValidationError
          ? error.errors[0] ?? "Check the password details."
          : "Check the password details.",
    };
  }

  const admin = createAdminClient();
  const tokenHash = invitationTokenHash(token);
  const { data: invitation, error: invitationError } = await admin
    .from("invitations")
    .select("id, email, role, expires_at, accepted_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (
    invitationError ||
    !invitation ||
    invitation.revoked_at
  ) {
    return { success: false, message: "This invitation is unavailable or expired." };
  }

  if (invitation.accepted_at) {
    const existingAccount = await findUserCreatedForInvitation(admin, {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
    });
    if (!existingAccount) {
      return { success: false, message: "This invitation is unavailable or expired." };
    }

    revalidatePath(`/invite/${token}`);
    revalidatePath("/admin/invitations");
    return { success: true, message: "Your staff account is ready. Sign in to continue." };
  }

  if (Date.parse(invitation.expires_at) <= Date.now()) {
    return { success: false, message: "This invitation is unavailable or expired." };
  }

  let account: User | null = null;
  try {
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email: invitation.email,
        password: input.password,
        email_confirm: true,
        app_metadata: {
          role: invitation.role,
          invitation_id: invitation.id,
        },
      });

    if (!createError) account = created.user;
  } catch {
    // The Auth request may have committed even if its response was interrupted.
    account = null;
  }

  if (!account) {
    const existingAccount = await findUserCreatedForInvitation(admin, {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
    });
    if (!existingAccount) {
      return {
        success: false,
        message:
          "The invitation could not be accepted. Contact the Super Admin who invited you.",
      };
    }

    // Make a retry safe after createUser succeeded but its response was lost.
    const { data: updated, error: passwordError } =
      await admin.auth.admin.updateUserById(existingAccount.id, {
        password: input.password,
      });
    if (passwordError || !updated.user) {
      return {
        success: false,
        message:
          "The invitation could not be completed. Please try again or contact the Super Admin who invited you.",
      };
    }
    account = updated.user;
  }

  const acceptedAt = new Date().toISOString();
  const { data: accepted, error: acceptError } = await admin
    .from("invitations")
    .update({ accepted_at: acceptedAt })
    .eq("id", invitation.id)
    .eq("token_hash", tokenHash)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (acceptError || !accepted) {
    const { data: currentInvitation, error: invitationStateError } = await admin
      .from("invitations")
      .select("accepted_at, revoked_at, token_hash")
      .eq("id", invitation.id)
      .maybeSingle();

    if (
      !invitationStateError &&
      !currentInvitation?.accepted_at &&
      (!currentInvitation ||
        currentInvitation.revoked_at ||
        currentInvitation.token_hash !== tokenHash)
    ) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(
        account.id,
      );
      if (cleanupError) {
        console.error("Could not clean up an account from an invalid invitation.");
      }
      return {
        success: false,
        message: "This invitation is unavailable or expired.",
      };
    }

    if (
      !invitationStateError &&
      currentInvitation &&
      !currentInvitation.accepted_at
    ) {
      const { data: retriedAcceptance, error: retryError } = await admin
        .from("invitations")
        .update({ accepted_at: acceptedAt })
        .eq("id", invitation.id)
        .eq("token_hash", tokenHash)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .select("id")
        .maybeSingle();

      if (retryError || !retriedAcceptance) {
        console.error(
          "Staff account was created, but the invitation status could not be finalized.",
        );
      }
    } else if (invitationStateError) {
      console.error(
        "Staff account was created, but the invitation status could not be finalized.",
      );
    }
  }

  revalidatePath(`/invite/${token}`);
  revalidatePath("/admin/invitations");
  return { success: true, message: "Your staff account is ready. Sign in to continue." };
}
