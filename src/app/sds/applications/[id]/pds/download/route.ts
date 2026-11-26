import { getSdsContext } from "@/lib/auth/server";
import { downloadStaffApplicationPds } from "@/lib/pds/staff-download";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const [{ id }, sds] = await Promise.all([context.params, getSdsContext()]);
  if (!sds) return new Response("Unauthorized", { status: 401 });
  return downloadStaffApplicationPds(sds.supabase, id);
}
