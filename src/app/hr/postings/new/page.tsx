import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { getHrContext } from "@/lib/auth/server";
import { getConfiguredPositions } from "../data";
import { PostingForm } from "../components/PostingForm";

export default async function NewPostingPage() {
  const hr = await getHrContext();
  if (!hr) redirect("/");
  const { data: positions, error } = await getConfiguredPositions(hr.supabase);

  return (
    <>
      <PageHeader
        description="Add a role, describe the opportunity, and choose its applicable positions."
        eyebrow="HR workspace"
        title="Create job posting"
      />
      {error || !positions ? (
        <div className="mt-7">
          <EmptyState
            description="Refresh the page to try loading configured positions again."
            title="Positions unavailable"
          />
        </div>
      ) : (
        <PostingForm positions={positions} />
      )}
    </>
  );
}
