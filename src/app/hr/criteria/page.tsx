import { readBands } from "@/utils/scoring";
import type { ScoringRule } from "@/types/scoring";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getHrContext } from "@/lib/auth/server";
import { PositionCriteriaManager } from "./components/PositionCriteriaManager";

export default async function HrPositionCriteriaPage() {
  const hr = await getHrContext();
  if (!hr) redirect("/");

  const [
    positionsResult,
    criteriaResult,
    applicationTypesResult,
    educationLevelsResult,
  ] = await Promise.all([
    hr.supabase
      .from("positions")
      .select(
        "id, title, application_type_id, is_active, base_qualification_level, base_training_increment_level, base_experience_increment_level",
      )
      .order("title"),
    hr.supabase
      .from("position_criteria")
      .select("id, position_id, criterion_key, title, display_order")
      .order("position_id")
      .order("display_order"),
    hr.supabase.from("application_type").select("id, name"),
    hr.supabase
      .from("education_levels")
      .select("qualification_level, description")
      .order("qualification_level"),
  ]);

  if (
    positionsResult.error ||
    criteriaResult.error ||
    applicationTypesResult.error ||
    educationLevelsResult.error
  ) {
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

  const applicationTypeNames = new Map(
    (applicationTypesResult.data ?? []).map((applicationType) => [
      applicationType.id,
      applicationType.name,
    ]),
  );
  const teachingOrder = [
    "teacher i",
    "teacher ii",
    "teacher iii",
    "teacher iv",
    "teacher v",
    "teacher vi",
    "teacher vii",
    "master teacher i",
    "master teacher ii",
    "master teacher iii",
    "master teacher iv",
    "master teacher v",
  ];
  const positions = (positionsResult.data ?? [])
    .map((position) => ({
      ...position,
      applicationType:
        applicationTypeNames.get(position.application_type_id) ?? "",
    }))
    .sort((first, second) => {
      const firstIsTeaching = first.applicationType === "teaching";
      const secondIsTeaching = second.applicationType === "teaching";
      if (firstIsTeaching !== secondIsTeaching) return firstIsTeaching ? -1 : 1;
      if (!firstIsTeaching) return first.title.localeCompare(second.title);

      const firstTitle = first.title.trim().toLocaleLowerCase();
      const secondTitle = second.title.trim().toLocaleLowerCase();
      const firstRank = teachingOrder.indexOf(firstTitle);
      const secondRank = teachingOrder.indexOf(secondTitle);

      if (firstRank >= 0 || secondRank >= 0) {
        if (firstRank < 0) return 1;
        if (secondRank < 0) return -1;
        return firstRank - secondRank;
      }

      return first.title.localeCompare(second.title);
    });
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
        .select("profile_id, criterion_id, points, minimum_level, bands")
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
    { version: number; weights: Record<string, number>; rules: ScoringRule[] }
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
      rules: [],
    };
  }
  for (const weight of currentWeights ?? []) {
    const profile = positionByProfile.get(weight.profile_id);
    if (profile) {
      const criterion = criteriaResult.data?.find((c) => c.id === weight.criterion_id);
      if (criterion) profileByPosition[profile.positionId].rules.push({ criterion_id: criterion.id, criterion_key: criterion.criterion_key, title: criterion.title, points: weight.points, minimum_level: weight.minimum_level, bands: readBands(weight.bands) });
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
        educationLevels={educationLevelsResult.data ?? []}
        positions={positions}
        profileByPosition={profileByPosition}
      />
    </>
  );
}
