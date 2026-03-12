"use server";

import { queryDocs, updateDoc, insertDoc, serializeDoc } from "@/lib/firebase/db";
import { revalidatePath } from "next/cache";

export async function getIntegrations() {
  try {
    const data = await queryDocs("integrations");
    return data.map(serializeDoc);
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return [];
  }
}

export async function toggleIntegration(id: string, currentStatus: string) {
  const newStatus = currentStatus === "Connected" ? "Disconnected" : "Connected";

  try {
    await updateDoc("integrations", id, {
      status: newStatus,
      last_sync: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error toggling integration ${id}:`, error);
    return { success: false, error };
  }

  revalidatePath("/dashboard/integrations");
  return { success: true };
}

export async function logIntegrationActivity(
  integrationId: string,
  activityType: string,
  details: Record<string, unknown>
) {
  try {
    await insertDoc("integration_logs", {
      integration_id: integrationId,
      activity_type: activityType,
      details: details,
    });
  } catch (error) {
    console.error("Error logging integration activity:", error);
    return { success: false, error };
  }

  return { success: true };
}
