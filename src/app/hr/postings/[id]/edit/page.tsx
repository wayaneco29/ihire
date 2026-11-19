import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getHrContext } from "@/lib/auth/server";
import { getConfiguredPositions } from "../../data";
import { PostingForm } from "../../components/PostingForm";

export default async function EditPostingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hr = await getHrContext();
  if (!hr) redirect("/");
  const { data: posting, error } = await hr.supabase.from("job_postings")
    .select("id, title, description, requirements, slots, status, deadline")
    .eq("id", id)
    .maybeSingle();
  if (error || !posting) notFound();

  const selectedResult = await hr.supabase
    .from("job_posting_positions")
    .select("position_id")
    .eq("job_id", id);
  if (selectedResult.error) {
    return (
      <>
        <PageHeader
          description="Update position details and applicable roles."
          eyebrow="HR workspace"
          title="Edit job posting"
        />
        <div className="mt-7">
          <EmptyState
            description="Refresh the page to try loading position selections again."
            title="Position selections unavailable"
          />
        </div>
      </>
    );
  }
  const positionIds = (selectedResult.data ?? []).map(
    (selection) => selection.position_id,
  );
  const positionsResult = await getConfiguredPositions(hr.supabase, positionIds);
  if (positionsResult.error || !positionsResult.data) {
    return (
      <>
        <PageHeader
          description="Update position details and applicable roles."
          eyebrow="HR workspace"
          title="Edit job posting"
        />
        <div className="mt-7">
          <EmptyState
            description="Refresh the page to try loading position selections again."
            title="Position selections unavailable"
          />
        </div>
      </>
    );
  }
  const selectedPositionsResult = positionIds.length
    ? await hr.supabase
        .from("positions")
        .select("id, application_type_id")
        .in("id", positionIds)
    : { data: [], error: null };
  if (selectedPositionsResult.error) {
    return (
      <>
        <PageHeader
          description="Update position details and applicable roles."
          eyebrow="HR workspace"
          title="Edit job posting"
        />
        <div className="mt-7">
          <EmptyState
            description="Refresh the page to try loading position selections again."
            title="Position selections unavailable"
          />
        </div>
      </>
    );
  }
  const applicationTypeId = selectedPositionsResult.data?.[0]?.application_type_id;
  const selectedApplicationType = applicationTypeId
    ? await hr.supabase
        .from("application_type")
        .select("name")
        .eq("id", applicationTypeId)
        .maybeSingle()
    : { data: null, error: null };
  if (selectedApplicationType.error) {
    return (
      <>
        <PageHeader
          description="Update position details and applicable roles."
          eyebrow="HR workspace"
          title="Edit job posting"
        />
        <div className="mt-7">
          <EmptyState
            description="Refresh the page to try loading position selections again."
            title="Position selections unavailable"
          />
        </div>
      </>
    );
  }
  const hiringTrack =
    selectedApplicationType.data?.name === "non-teaching"
      ? "NON_TEACHING"
      : "TEACHING";

  return <>
    <PageHeader description="Update the position details and manage its open, draft, or closed status." eyebrow="HR workspace" title="Edit job posting" />
    <PostingForm
      positions={positionsResult.data}
      posting={{
        ...posting,
        requirements: posting.requirements ?? "",
        deadline: posting.deadline ?? "",
        hiringTrack:
          hiringTrack === "NON_TEACHING" ? "NON_TEACHING" : "TEACHING",
        positionIds,
      }}
    />
  </>;
}
