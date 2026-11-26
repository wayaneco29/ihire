import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { AppShell } from "@/components/layout/AppShell";
import { getAdminContext } from "@/lib/auth/server";
import { InvitationManager } from "./components/InvitationManager";

export const metadata: Metadata = { title: "Staff invitations" };

export default async function InvitationsPage() {
  const admin = await getAdminContext();
  if (!admin) redirect("/");

  const { data } = await admin.supabase
    .from("invitations")
    .select("id, email, role, created_at, expires_at, accepted_at, revoked_at")
    .order("created_at", { ascending: false });

  return (
    <AppShell>
      <div className="space-y-7">
        <PageHeader
          eyebrow="Administration"
          title="Staff invitations"
          description="Invite staff with a one-time link. Links are not sent by email."
        />
        <InvitationManager invitations={data ?? []} />
      </div>
    </AppShell>
  );
}
