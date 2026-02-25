"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getIntegrations() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("*");

  if (error) {
    console.error("Error fetching integrations:", error);
    return [];
  }

  return data;
}

export async function toggleIntegration(id: string, currentStatus: string) {
  const supabase = await createClient();
  const newStatus = currentStatus === "Connected" ? "Disconnected" : "Connected";

  const { error } = await supabase
    .from("integrations")
    .update({ status: newStatus, last_sync: new Date().toISOString() })
    .eq("id", id);

  if (error) {
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
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("integration_logs")
    .insert({
      integration_id: integrationId,
      activity_type: activityType,
      details: details,
    });

  if (error) {
    console.error("Error logging integration activity:", error);
    return { success: false, error };
  }

  return { success: true };
}
