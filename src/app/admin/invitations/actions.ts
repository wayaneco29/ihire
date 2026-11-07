"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { ValidationError } from "yup";
import { getAdminContext } from "@/lib/auth/server";
import { invitationSchema } from "./schema";

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

type ActionResult =
  | { success: true; invitePath: string; expiresAt: string }
  | { success: false; message: string };

function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function newToken() {
  return randomBytes(32).toString("base64url");
}

function validationMessage(error: unknown) {
  return error instanceof ValidationError
    ? error.errors[0] ?? "Check the invitation details."
    : "Check the invitation details.";
}

export async function createInvitation(values: unknown): Promise<ActionResult> {
  const admin = await getAdminContext();
  if (!admin) return { success: false, message: "Admin access is required." };

  let input;
  try {
    input = await invitationSchema.validate(values, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    return { success: false, message: validationMessage(error) };
  }

  const token = newToken();
  const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS).toISOString();
  const { error } = await admin.supabase.from("invitations").insert({
    email: input.email,
    role: input.role,
    token_hash: hashToken(token),
    invited_by: admin.user.id,
    expires_at: expiresAt,
  });

  if (error) {
    return {
      success: false,
      message: "An active invitation may already exist for this email.",
    };
  }

  revalidatePath("/admin/invitations");
  return { success: true, invitePath: `/invite/${token}`, expiresAt };
}

export async function revokeInvitation(id: string) {
  const admin = await getAdminContext();
  if (!admin) return { success: false, message: "Admin access is required." };

  const { data, error } = await admin.supabase
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return { success: false, message: "This invitation is no longer pending." };
  }

  revalidatePath("/admin/invitations");
  return { success: true, message: "Invitation revoked." };
}

export async function resendInvitation(id: string): Promise<ActionResult> {
  const admin = await getAdminContext();
  if (!admin) return { success: false, message: "Admin access is required." };

  const token = newToken();
  const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS).toISOString();
  const { data, error } = await admin.supabase
    .from("invitations")
    .update({ token_hash: hashToken(token), expires_at: expiresAt })
    .eq("id", id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return { success: false, message: "Only pending invitations can be resent." };
  }

  revalidatePath("/admin/invitations");
  return { success: true, invitePath: `/invite/${token}`, expiresAt };
}
