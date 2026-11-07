import type { Metadata } from "next";
import { Alert } from "antd";
import { getInvitePreview } from "@/lib/invitations";
import { AcceptInviteForm } from "./components/AcceptInviteForm";

export const metadata: Metadata = {
  title: "Accept staff invitation",
  robots: { index: false, follow: false },
};

export default async function InvitePage({
  params,
}: Readonly<{ params: Promise<{ token: string }> }>) {
  const { token } = await params;
  const invitation = await getInvitePreview(token);

  if (!invitation) {
    return (
      <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm sm:p-8">
        <Alert
          message="Invitation unavailable"
          description="This link may have expired, been revoked, or already been used. Ask the Admin to resend it."
          showIcon
          type="warning"
        />
      </section>
    );
  }

  return (
    <AcceptInviteForm
      email={invitation.email}
      role={invitation.role}
      token={token}
    />
  );
}
