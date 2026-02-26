import { createAdminClient } from "@/lib/supabase/admin";

type ActivityDetails = Record<string, unknown>;

interface LogActivityInput {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: ActivityDetails;
}

export async function logActivity({
  userId,
  action,
  entityType,
  entityId = null,
  details = {},
}: LogActivityInput) {
  if (!action || !entityType) return;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const targetName =
    typeof details.target_name === "string" ? details.target_name.trim() : null;

  const composedAction = targetName
    ? `${action} ${entityType}: ${targetName}`
    : `${action} ${entityType}`;

  const payload: {
    action: string;
    entity_type: string;
    entity_id: string | null;
    actor_id?: string;
  } = {
    action: composedAction,
    entity_type: entityType,
    entity_id:
      typeof entityId === "string" && uuidRegex.test(entityId) ? entityId : null,
  };

  try {
    const supabase = createAdminClient();

    if (userId) payload.actor_id = userId;

    let { error } = await supabase.from("activity_logs").insert(payload);

    // If the Clerk user is not synced in `users`, retry without actor_id so activity is still recorded.
    if (error?.code === "23503" && payload.actor_id) {
      delete payload.actor_id;
      const fallback = await supabase.from("activity_logs").insert(payload);
      error = fallback.error;
    }

    if (error) {
      console.error("Failed to write activity log:", error.code, error.message);
    }
  } catch (error) {
    console.error("Unexpected activity log failure:", error);
  }
}
