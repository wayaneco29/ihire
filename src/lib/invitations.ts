import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function invitationTokenHash(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function getInvitePreview(token: string) {
  if (!TOKEN_PATTERN.test(token)) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invitations")
    .select("id, email, role, expires_at, accepted_at, revoked_at")
    .eq("token_hash", invitationTokenHash(token))
    .maybeSingle();

  if (error || !data || data.revoked_at) {
    return null;
  }

  if (data.accepted_at) {
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, role")
      .eq("email", data.email)
      .maybeSingle();

    if (profileError || !profile || profile.role !== data.role) return null;

    const { data: accountData, error: accountError } =
      await admin.auth.admin.getUserById(profile.id);
    const account = accountData.user;
    if (
      accountError ||
      !account ||
      account.email?.trim().toLowerCase() !== data.email ||
      account.app_metadata.invitation_id !== data.id ||
      account.app_metadata.role !== data.role
    ) {
      return null;
    }

    return { email: data.email, role: data.role, status: "accepted" as const };
  }

  if (Date.parse(data.expires_at) <= Date.now()) return null;

  return {
    email: data.email,
    role: data.role,
    expiresAt: data.expires_at,
    status: "pending" as const,
  };
}
