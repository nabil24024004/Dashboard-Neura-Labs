import { queryDocs, serializeDoc } from "@/lib/firebase/db";
import { IntegrationsClient, Integration } from "@/components/dashboard/integrations/integrations-client";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  let integrations: Integration[] = [];
  let initialLoadError: string | null = null;

  try {
    const data = await queryDocs("integrations");
    integrations = data.map(serializeDoc) as Integration[];
  } catch (err) {
    console.error("Integrations page exception:", err);
    initialLoadError = "Could not load integrations right now.";
  }

  return <IntegrationsClient initialIntegrations={integrations} initialLoadError={initialLoadError} />;
}
