import { getHrContext } from "@/lib/auth/server";
import { downloadStaffApplicationPds } from "@/lib/pds/staff-download";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const [{ id }, hr] = await Promise.all([context.params, getHrContext()]);
  if (!hr) return new Response("Unauthorized", { status: 401 });
  return downloadStaffApplicationPds(hr.supabase, id);
}
