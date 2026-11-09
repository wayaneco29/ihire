import type { Metadata } from "next";
import { Alert } from "antd";
import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";
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

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <Link className="mb-7 flex justify-center" href="/">
          <BrandMark />
        </Link>
        {invitation ? (
          <AcceptInviteForm
            email={invitation.email}
            role={invitation.role}
            token={token}
          />
        ) : (
          <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm sm:p-8">
            <Alert
              message="Invitation unavailable"
              description="This link may have expired, been revoked, or already been used. Ask the Admin to resend it."
              showIcon
              type="warning"
            />
          </section>
        )}
      </div>
    </main>
  );
}
