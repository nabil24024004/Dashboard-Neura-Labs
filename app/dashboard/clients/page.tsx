import { queryDocs, serializeDoc } from "@/lib/firebase/db";
import { ClientsSplitView } from "@/components/dashboard/clients/client-split-view";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const data = await queryDocs(
    "clients",
    [{ field: "deleted_at", op: "==", value: null }]
  );

  const safeClients = data
    .map((client) => serializeDoc(client))
    .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime()) as Parameters<
      typeof ClientsSplitView
    >[0]["initialData"];

  return <ClientsSplitView initialData={safeClients} />;
}
