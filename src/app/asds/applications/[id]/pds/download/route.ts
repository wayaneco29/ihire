import { getAsdsContext } from "@/lib/auth/server";
import { downloadStaffApplicationPds } from "@/lib/pds/staff-download";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const [{ id }, asds] = await Promise.all([context.params, getAsdsContext()]);
  if (!asds) return new Response("Unauthorized", { status: 401 });
  return downloadStaffApplicationPds(asds.supabase, id);
}
