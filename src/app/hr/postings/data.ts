import type { getHrContext } from "@/lib/auth/server";
import type { ScoringRule } from "@/types/scoring";
import { readBands } from "@/utils/scoring";

type HrSupabase = NonNullable<Awaited<ReturnType<typeof getHrContext>>>["supabase"];
const APPLICANT_STATUS_PAGE_SIZE = 1000;

export async function getPostingApplicantStatuses(
  supabase: HrSupabase,
  jobIds: string[],
) {
  if (!jobIds.length) return { data: [], error: null };

  const columns = "application_id, job_id, application_status";
  const firstPage = await supabase
    .from("v_anonymized_applicants")
    .select(columns, { count: "exact" })
    .in("job_id", jobIds)
    .order("application_id", { ascending: true })
    .range(0, APPLICANT_STATUS_PAGE_SIZE - 1);

  if (firstPage.error) return { data: null, error: firstPage.error };

  const applications = [...(firstPage.data ?? [])];
  const totalCount = firstPage.count ?? applications.length;
  const remainingOffsets = Array.from(
    {
      length: Math.ceil(
        Math.max(0, totalCount - applications.length) /
          APPLICANT_STATUS_PAGE_SIZE,
      ),
    },
    (_, index) => (index + 1) * APPLICANT_STATUS_PAGE_SIZE,
  );
  const remainingPages = await Promise.all(
    remainingOffsets.map((offset) =>
      supabase
        .from("v_anonymized_applicants")
        .select(columns)
        .in("job_id", jobIds)
        .order("application_id", { ascending: true })
        .range(offset, offset + APPLICANT_STATUS_PAGE_SIZE - 1),
    ),
  );
  const error = remainingPages.find((page) => page.error)?.error ?? null;

  if (error) return { data: null, error };

  applications.push(...remainingPages.flatMap((page) => page.data ?? []));
  return { data: applications, error: null };
}

export async function getConfiguredPositions(
  supabase: HrSupabase,
  includeArchivedPositionIds: string[] = [],
) {
  const [positionsResult, applicationTypesResult] = await Promise.all([
    supabase
      .from("positions")
      .select("id, title, application_type_id, is_active")
      .order("title"),
    supabase.from("application_type").select("id, name"),
  ]);
  const { data: positions, error: positionsError } = positionsResult;

  if (positionsError || applicationTypesResult.error || !positions?.length) {
    return {
      data: positionsError || applicationTypesResult.error ? null : [],
      error: positionsError ?? applicationTypesResult.error,
    };
  }

  const applicationTypeById = new Map(
    (applicationTypesResult.data ?? []).map((applicationType) => [
      applicationType.id,
      applicationType.name,
    ]),
  );
  const includedArchivedIds = new Set(includeArchivedPositionIds);
  const positionsWithTrack = positions
    .filter(
      (position) =>
        position.is_active || includedArchivedIds.has(position.id),
    )
    .map((position) => ({
      ...position,
      track:
        applicationTypeById.get(position.application_type_id) === "teaching"
          ? "TEACHING"
          : "NON_TEACHING",
    }));

  if (!positionsWithTrack.length) return { data: [], error: null };

  const { data: profiles, error: profilesError } = await supabase
    .from("position_weight_profiles")
    .select("id, position_id, version")
    .eq("is_current", true)
    .in(
      "position_id",
      positionsWithTrack.map((position) => position.id),
    );

  if (profilesError) return { data: null, error: profilesError };

  const profileIds = (profiles ?? []).map((profile) => profile.id);
  const [weightsResult, criteriaResult] = await Promise.all([
    profileIds.length ? supabase.from("position_criterion_weights")
      .select("profile_id, criterion_id, points, minimum_level, bands").in("profile_id", profileIds) : Promise.resolve({ data: [], error: null }),
    supabase.from("position_criteria").select("id, criterion_key, title, display_order")
      .in("position_id", positionsWithTrack.map((position) => position.id)).order("display_order"),
  ]);
  if (weightsResult.error || criteriaResult.error) return { data: null, error: weightsResult.error ?? criteriaResult.error };
  const criterionById = new Map((criteriaResult.data ?? []).map((criterion) => [criterion.id, criterion]));
  const rulesByProfile = new Map<string, ScoringRule[]>();
  for (const weight of weightsResult.data ?? []) {
    const criterion = criterionById.get(weight.criterion_id);
    if (!criterion) continue;
    const rules = rulesByProfile.get(weight.profile_id) ?? [];
    rules.push({ criterion_id: criterion.id, criterion_key: criterion.criterion_key, title: criterion.title, points: weight.points, minimum_level: weight.minimum_level, bands: readBands(weight.bands) });
    rulesByProfile.set(weight.profile_id, rules);
  }
  const profileByPosition = new Map((profiles ?? []).map((profile) => [profile.position_id, profile]));
  const configuredIds = new Set((profiles ?? []).filter((profile) =>
    (rulesByProfile.get(profile.id) ?? []).length > 0).map((profile) => profile.position_id));
  return {
    data: positionsWithTrack.filter((position) => configuredIds.has(position.id)).map((position) => {
      const profile = profileByPosition.get(position.id)!;
      return { ...position, scoringProfileId: profile.id, scoringProfileVersion: profile.version, scoringRules: rulesByProfile.get(profile.id) ?? [] };
    }),
    error: null,
  };
}
