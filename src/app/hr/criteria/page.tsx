import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getHrContext } from "@/lib/auth/server";
import { PositionCriteriaManager } from "./components/PositionCriteriaManager";

export default async function HrPositionCriteriaPage() {
  const hr = await getHrContext();
  if (!hr) redirect("/login");

  const [positionsResult, criteriaResult] = await Promise.all([
    hr.supabase
      .from("positions")
      .select("id, track, title")
      .eq("is_active", true)
      .order("track")
      .order("title"),
    hr.supabase
      .from("position_criteria")
      .select("id, track, title, display_order")
      .order("track")
      .order("display_order"),
  ]);

  if (positionsResult.error || criteriaResult.error) {
    return (
      <>
        <PageHeader
          description="Manage position titles and their 100-point criteria profiles."
          eyebrow="HR workspace"
          title="Positions and criteria"
        />
        <div className="mt-7">
          <EmptyState
            description="Refresh the page to try loading position criteria again."
            title="Position settings unavailable"
          />
        </div>
      </>
    );
  }

  const positions = positionsResult.data ?? [];
  const { data: currentProfiles, error: profilesError } = positions.length
    ? await hr.supabase
        .from("position_weight_profiles")
        .select("id, position_id, version")
        .eq("is_current", true)
        .in(
          "position_id",
          positions.map((position) => position.id),
        )
    : { data: [], error: null };

  if (profilesError) {
    return (
      <>
        <PageHeader
          description="Manage position titles and their 100-point criteria profiles."
          eyebrow="HR workspace"
          title="Positions and criteria"
        />
        <div className="mt-7">
          <EmptyState
            description="Refresh the page to try loading position weight profiles again."
            title="Weight profiles unavailable"
          />
        </div>
      </>
    );
  }

  const profileIds = (currentProfiles ?? []).map((profile) => profile.id);
  const { data: currentWeights, error: weightsError } = profileIds.length
    ? await hr.supabase
        .from("position_criterion_weights")
        .select("profile_id, criterion_id, points")
        .in("profile_id", profileIds)
    : { data: [], error: null };

  if (weightsError) {
    return (
      <>
        <PageHeader
          description="Manage position titles and their 100-point criteria profiles."
          eyebrow="HR workspace"
          title="Positions and criteria"
        />
        <div className="mt-7">
          <EmptyState
            description="Refresh the page to try loading saved criterion weights again."
            title="Criterion weights unavailable"
          />
        </div>
      </>
    );
  }

  const profileByPosition: Record<
    string,
    { version: number; weights: Record<string, number> }
  > = {};
  const positionByProfile = new Map(
    (currentProfiles ?? []).map((profile) => [
      profile.id,
      { positionId: profile.position_id, version: profile.version },
    ]),
  );

  for (const profile of currentProfiles ?? []) {
    profileByPosition[profile.position_id] = {
      version: profile.version,
      weights: {},
    };
  }
  for (const weight of currentWeights ?? []) {
    const profile = positionByProfile.get(weight.profile_id);
    if (profile) {
      profileByPosition[profile.positionId].weights[weight.criterion_id] =
        weight.points;
    }
  }

  return (
    <>
      <PageHeader
        description="Create positions and set a separate 100-point criteria profile for each one."
        eyebrow="HR workspace"
        title="Positions and criteria"
      />
      <PositionCriteriaManager
        criteria={criteriaResult.data ?? []}
        positions={positions}
        profileByPosition={profileByPosition}
      />
    </>
  );
}
