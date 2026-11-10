import type { getHrContext } from "@/lib/auth/server";

type HrSupabase = NonNullable<Awaited<ReturnType<typeof getHrContext>>>["supabase"];

export async function getConfiguredPositions(supabase: HrSupabase) {
  const [positionsResult, applicationTypesResult] = await Promise.all([
    supabase
      .from("positions")
      .select("id, title, application_type_id")
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
  const positionsWithTrack = positions.map((position) => ({
    ...position,
    track:
      applicationTypeById.get(position.application_type_id) === "teaching"
        ? "TEACHING"
        : "NON_TEACHING",
  }));

  const { data: profiles, error: profilesError } = await supabase
    .from("position_weight_profiles")
    .select("position_id")
    .eq("is_current", true)
    .in(
      "position_id",
      positionsWithTrack.map((position) => position.id),
    );

  if (profilesError) return { data: null, error: profilesError };

  const configuredIds = new Set(
    (profiles ?? []).map((profile) => profile.position_id),
  );
  return {
    data: positionsWithTrack.filter((position) => configuredIds.has(position.id)),
    error: null,
  };
}
