import { insertDoc } from "@/lib/firebase/db";

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

  const targetName =
    typeof details.target_name === "string" ? details.target_name.trim() : null;

  const composedAction = targetName
    ? `${action} ${entityType}: ${targetName}`
    : `${action} ${entityType}`;

  const payload: Record<string, unknown> = {
    action: composedAction,
    entity_type: entityType,
    entity_id: entityId || null,
    timestamp: new Date().toISOString(),
  };

  if (userId) payload.actor_id = userId;

  try {
    await insertDoc("activity_logs", payload);
  } catch (error) {
    console.error("Failed to write activity log:", error);
  }
}
