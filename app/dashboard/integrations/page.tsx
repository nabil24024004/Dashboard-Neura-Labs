import { createAdminClient } from "@/lib/supabase/admin";
import { IntegrationsClient, Integration } from "@/components/dashboard/integrations/integrations-client";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  let integrations: Integration[] = [];
  let initialLoadError: string | null = null;

  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("integrations")
      .select("*");

    if (error) {
      console.error("Integrations query error:", error.message, error.code, error.details);
      initialLoadError = `Could not load integrations: ${error.message}`;
    } else if (data) {
      integrations = data as Integration[];
    }
  } catch (err) {
    console.error("Integrations page exception:", err);
    initialLoadError = "Could not load integrations right now.";
  }

  return <IntegrationsClient initialIntegrations={integrations} initialLoadError={initialLoadError} />;
}
