import { getApplicantContext } from "@/lib/auth/server";
import { generateSpecialOrder } from "@/lib/special-order";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const [{ id }, applicant] = await Promise.all([context.params, getApplicantContext()]);
  if (!applicant) return Response.json({ message: "Applicant access is required." }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ message: "Special Order not found." }, { status: 404 });
  const { data: application, error: applicationError } = await applicant.supabase.from("applications")
    .select("id").eq("id", id).eq("applicant_id", applicant.applicant.id).eq("status", "HIRED").maybeSingle();
  if (applicationError) return Response.json({ message: "Special Order could not be loaded." }, { status: 500 });
  if (!application) return Response.json({ message: "Special Order not found." }, { status: 404 });
  const { data, error } = await applicant.supabase.from("application_special_orders").select("*").eq("application_id", id).maybeSingle();
  if (error) return Response.json({ message: "Special Order could not be loaded." }, { status: 500 });
  if (!data) return Response.json({ message: "Your Special Order has not been prepared yet." }, { status: 404 });
  try {
    const bytes = await generateSpecialOrder(data.applicant_name, { position: data.position, designation: data.designation, orderNumber: data.order_number, date: data.order_date });
    return new Response(new Blob([bytes as Uint8Array<ArrayBuffer>]), { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="special-order-${id}.docx"`,
      "Cache-Control": "private, no-store",
    } });
  } catch {
    return Response.json({ message: "Your Special Order could not be generated. Please try again." }, { status: 500 });
  }
}
