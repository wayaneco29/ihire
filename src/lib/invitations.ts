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
    .select("email, role, expires_at, accepted_at, revoked_at")
    .eq("token_hash", invitationTokenHash(token))
    .maybeSingle();

  if (
    error ||
    !data ||
    data.accepted_at ||
    data.revoked_at ||
    Date.parse(data.expires_at) <= Date.now()
  ) {
    return null;
  }

  return { email: data.email, role: data.role, expiresAt: data.expires_at };
}
