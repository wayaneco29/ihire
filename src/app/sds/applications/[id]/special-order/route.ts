import { ValidationError } from "yup";
import { revalidatePath } from "next/cache";
import { getSdsContext } from "@/lib/auth/server";
import { generateSpecialOrder } from "@/lib/special-order";
import { specialOrderDraftSchema, specialOrderSchema } from "@/utils/special-order-schema";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const [{ id }, sds] = await Promise.all([context.params, getSdsContext()]);
  if (!sds) return Response.json({ message: "SDS access is required." }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ message: "Application not found." }, { status: 404 });
  const { data, error } = await sds.supabase.from("application_special_orders").select("position, designation, order_number, order_date").eq("application_id", id).maybeSingle();
  if (error) return Response.json({ message: "Saved Special Order could not be loaded. Close and reopen to try again." }, { status: 500 });
  return Response.json({ values: data ? { position: data.position, designation: data.designation, orderNumber: data.order_number, date: data.order_date } : null }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request, context: Context) {
  return writeSpecialOrder(request, context, true);
}

export async function POST(request: Request, context: Context) {
  return writeSpecialOrder(request, context, false);
}

async function writeSpecialOrder(request: Request, context: Context, saveOnly: boolean) {
  const [{ id }, sds] = await Promise.all([context.params, getSdsContext()]);
  if (!sds) return Response.json({ message: "SDS access is required." }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ message: "Application not found." }, { status: 404 });
  const { data: application, error } = await sds.supabase.from("v_staff_application_reviews")
    .select("application_id, applicant_name, application_status")
    .eq("application_id", id).maybeSingle();
  if (error) return Response.json({ message: "Application could not be loaded." }, { status: 500 });
  if (!application) return Response.json({ message: "Application not found." }, { status: 404 });
  if (application.application_status !== "HIRED") return Response.json({ message: "Confirm the hire before preparing the Special Order." }, { status: 409 });
  let input;
  try { input = await request.json(); }
  catch { return Response.json({ message: "Invalid Special Order details." }, { status: 400 }); }
  try {
    const preview = !saveOnly && input?.preview === true;
    const schema = preview ? specialOrderDraftSchema : specialOrderSchema;
    const values = await schema.validate(input, { abortEarly: false, stripUnknown: true });
    const bytes = await generateSpecialOrder(application.applicant_name, values);
    if (!preview) {
      const { error: saveError } = await sds.supabase.from("application_special_orders").upsert({
        application_id: id, applicant_name: application.applicant_name,
        position: values.position, designation: values.designation,
        order_number: values.orderNumber, order_date: values.date, updated_at: new Date().toISOString(),
      }, { onConflict: "application_id" });
      if (saveError) return Response.json({ message: "The Special Order could not be saved. Please try again." }, { status: 500 });
      revalidatePath(`/applicant/applications/${id}`);
      if (saveOnly) return Response.json({ message: "Special Order saved. The applicant can now download it." });
    }
    return new Response(new Blob([bytes as Uint8Array<ArrayBuffer>]), { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="special-order-${id}.docx"`,
      "Cache-Control": "private, no-store",
    } });
  } catch (error) {
    if (error instanceof ValidationError) return Response.json({ message: error.errors[0] }, { status: 400 });
    return Response.json({ message: "The Special Order could not be generated. Try again." }, { status: 500 });
  }
}
