import type { getHrContext } from "@/lib/auth/server";

type HrSupabase = NonNullable<Awaited<ReturnType<typeof getHrContext>>>["supabase"];

export async function getConfiguredPositions(supabase: HrSupabase) {
  const { data: positions, error: positionsError } = await supabase
    .from("positions")
    .select("id, track, title")
    .eq("is_active", true)
    .order("track")
    .order("title");

  if (positionsError || !positions?.length) {
    return { data: positionsError ? null : [], error: positionsError };
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("position_weight_profiles")
    .select("position_id")
    .eq("is_current", true)
    .in(
      "position_id",
      positions.map((position) => position.id),
    );

  if (profilesError) return { data: null, error: profilesError };

  const configuredIds = new Set(
    (profiles ?? []).map((profile) => profile.position_id),
  );
  return {
    data: positions.filter((position) => configuredIds.has(position.id)),
    error: null,
  };
}
