"use server";

import { revalidatePath } from "next/cache";
import { ValidationError } from "yup";
import { acceptInviteSchema } from "./schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { invitationTokenHash } from "@/lib/invitations";

type AcceptResult = { success: boolean; message: string };

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
    invitation.accepted_at ||
    invitation.revoked_at ||
    Date.parse(invitation.expires_at) <= Date.now()
  ) {
    return { success: false, message: "This invitation is unavailable or expired." };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invitation.email,
    password: input.password,
    email_confirm: true,
    app_metadata: {
      role: invitation.role,
      invitation_id: invitation.id,
    },
  });

  if (createError || !created.user) {
    return {
      success: false,
      message: "The invitation could not be accepted. Contact the Admin who invited you.",
    };
  }

  const acceptedAt = new Date().toISOString();
  const { data: accepted, error: acceptError } = await admin
    .from("invitations")
    .update({ accepted_at: acceptedAt })
    .eq("id", invitation.id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", acceptedAt)
    .select("id")
    .maybeSingle();

  if (acceptError || !accepted) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { success: false, message: "This invitation is unavailable or expired." };
  }

  revalidatePath("/admin/invitations");
  return { success: true, message: "Your staff account is ready. Sign in to continue." };
}
