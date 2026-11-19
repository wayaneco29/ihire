import type { Metadata } from "next";
import { Alert } from "antd";
import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { getInvitePreview } from "@/lib/invitations";
import { InviteAccountReady } from "../components/InviteAccountReady";
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

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <Link className="mb-7 flex justify-center" href="/">
          <BrandMark />
        </Link>
        {invitation?.status === "pending" ? (
          <AcceptInviteForm
            email={invitation.email}
            role={invitation.role}
            token={token}
          />
        ) : invitation?.status === "accepted" ? (
          <SurfaceCard as="section" className="p-6 sm:p-8">
            <InviteAccountReady
              alreadyAccepted
              description="This invitation has already been used. Sign in with the password you created to continue."
              email={invitation.email}
            />
          </SurfaceCard>
        ) : (
          <SurfaceCard as="section" className="p-6 sm:p-8">
            <Alert
              message="Invitation unavailable"
              description="This link may have expired, been revoked, or already been used. Ask the Admin to resend it."
              showIcon
              type="warning"
            />
          </SurfaceCard>
        )}
      </div>
    </main>
  );
}
