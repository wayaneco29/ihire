import { createClient } from "@/lib/supabase/server";

type NotificationAction =
  | { action: "mark-read"; id: string }
  | { action: "mark-all-read" };

function isNotificationAction(value: unknown): value is NotificationAction {
  if (!value || typeof value !== "object") return false;
  const action = value as Record<string, unknown>;
  return (
    (action.action === "mark-read" && typeof action.id === "string") ||
    action.action === "mark-all-read"
  );
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isNotificationAction(payload)) {
    return Response.json({ error: "Invalid notification action." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  if (payload.action === "mark-read") {
    const { data: updated, error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", payload.id)
      .eq("user_id", user.id)
      .eq("is_read", false)
      .select("id");

    if (updateError) {
      console.error("Failed to mark notification as read", updateError);
      return Response.json(
        { error: "This notification could not be marked as read." },
        { status: 500 },
      );
    }

    if (!updated.length) {
      const { data: current, error: verifyError } = await supabase
        .from("notifications")
        .select("is_read")
        .eq("id", payload.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (verifyError) {
        console.error("Failed to verify notification read status", verifyError);
        return Response.json(
          { error: "The notification read status could not be verified." },
          { status: 500 },
        );
      }
      if (!current?.is_read) {
        return Response.json(
          { error: "The notification was not updated or could not be found." },
          { status: 404 },
        );
      }
    }

    return Response.json({ success: true });
  }

  const { error: updateError } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (updateError) {
    console.error("Failed to mark all notifications as read", updateError);
    return Response.json(
      { error: "Notifications could not all be marked as read." },
      { status: 500 },
    );
  }

  const { count, error: verifyError } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (verifyError || count !== 0) {
    if (verifyError) {
      console.error("Failed to verify unread notifications", verifyError);
    } else {
      console.error("Unread notifications remain after the update");
    }
    return Response.json(
      { error: "Unread notifications remain or could not be verified." },
      { status: 500 },
    );
  }

  return Response.json({ success: true });
}
