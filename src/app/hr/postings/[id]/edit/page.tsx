import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getHrContext } from "@/lib/auth/server";
import { getConfiguredPositions } from "../../data";
import { PostingForm } from "../../components/PostingForm";
import { readBands } from "@/utils/scoring";
import type { ScoringRule } from "@/types/scoring";
import {
  getJobRequirements,
  getJobRequirementsPdfPath,
  JOB_REQUIREMENTS_BUCKET,
} from "@/utils/job-requirements";

export default async function EditPostingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hr = await getHrContext();
  if (!hr) redirect("/");
  const editDescription =
    "Describe the opportunity, choose the roles it covers, and set how applicants can respond.";
  const { data: posting, error } = await hr.supabase
    .from("job_postings")
    .select("id, title, description, requirements, requirements_items, slots, status, deadline, scoring_locked_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !posting) notFound();
  const { data: requirementsPdf } = await hr.supabase.storage
    .from(JOB_REQUIREMENTS_BUCKET)
    .createSignedUrl(getJobRequirementsPdfPath(id), 3600);

  const selectedResult = await hr.supabase
    .from("job_posting_positions")
    .select("position_id, weight_profile_id")
    .eq("job_id", id);
  if (selectedResult.error) {
    return (
      <>
        <PageHeader
          divider={false}
          description={editDescription}
          backHref={"/hr/postings/" + id}
          backLabel="Job posting"
          title="Edit posting"
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
  const snapshotProfileIds = (selectedResult.data ?? []).map((link) => link.weight_profile_id);
  const snapshotWeights = snapshotProfileIds.length
    ? await hr.supabase.from("position_criterion_weights")
        .select("profile_id, criterion_id, points, minimum_level, bands")
        .in("profile_id", snapshotProfileIds)
    : { data: [], error: null };
  const snapshotCriterionIds = [...new Set((snapshotWeights.data ?? []).map((weight) => weight.criterion_id))];
  const snapshotCriteria = snapshotCriterionIds.length
    ? await hr.supabase.from("position_criteria").select("id, criterion_key, title").in("id", snapshotCriterionIds)
    : { data: [], error: null };
  if (snapshotWeights.error || snapshotCriteria.error) {
    return <EmptyState description="Refresh the page to try loading the saved scoring rules." title="Scoring rules unavailable" />;
  }
  const criterionById = new Map((snapshotCriteria.data ?? []).map((criterion) => [criterion.id, criterion]));
  const rulesByProfile = new Map<string, ScoringRule[]>();
  for (const weight of snapshotWeights.data ?? []) {
    const criterion = criterionById.get(weight.criterion_id);
    if (!criterion) continue;
    const rules = rulesByProfile.get(weight.profile_id) ?? [];
    rules.push({ criterion_id: criterion.id, criterion_key: criterion.criterion_key, title: criterion.title, points: weight.points, minimum_level: weight.minimum_level, bands: readBands(weight.bands) });
    rulesByProfile.set(weight.profile_id, rules);
  }
  const scoring = (selectedResult.data ?? []).map((link) => ({
    position_id: link.position_id,
    rules: rulesByProfile.get(link.weight_profile_id) ?? [],
  }));
  const positionsResult = await getConfiguredPositions(
    hr.supabase,
    positionIds,
  );
  if (positionsResult.error || !positionsResult.data) {
    return (
      <>
        <PageHeader
          divider={false}
          description={editDescription}
          backHref={"/hr/postings/" + id}
          backLabel="Job posting"
          title="Edit posting"
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
          divider={false}
          description={editDescription}
          backHref={"/hr/postings/" + id}
          backLabel="Job posting"
          title="Edit posting"
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
  const applicationTypeId =
    selectedPositionsResult.data?.[0]?.application_type_id;
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
          divider={false}
          description={editDescription}
          backHref={"/hr/postings/" + id}
          backLabel="Job posting"
          title="Edit posting"
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

  return (
    <div className="mx-auto w-full">
      <PageHeader
        divider={false}
        description={editDescription}
        backHref={`/hr/postings/${id}`}
        backLabel="Job posting"
        title="Edit posting"
      />
      <PostingForm
        positions={positionsResult.data}
        posting={{
          ...posting,
          requirements: getJobRequirements(
            posting.requirements_items,
            posting.requirements,
          ),
          deadline: posting.deadline ?? "",
          hiringTrack:
            hiringTrack === "NON_TEACHING" ? "NON_TEACHING" : "TEACHING",
          positionIds,
          scoring,
          scoringLockedAt: posting.scoring_locked_at,
          requirementsPdfUrl: requirementsPdf?.signedUrl ?? null,
        }}
      />
    </div>
  );
}
