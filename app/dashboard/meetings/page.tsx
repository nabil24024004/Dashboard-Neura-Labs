import { queryDocs, getDoc, serializeDoc } from "@/lib/firebase/db";
import { MeetingsDataTable } from "@/components/dashboard/meetings/meetings-data-table";
import { columns, Meeting } from "@/components/dashboard/meetings/meetings-columns";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const data = await queryDocs(
    "meetings",
    [],
    [{ field: "scheduled_at", direction: "asc" }]
  );

  // Enrich with client/project names for backwards compatibility
  const enriched = await Promise.all(data.map(async (m) => {
    const doc = serializeDoc(m);
    if (m.client_id) {
      const client = await getDoc("clients", m.client_id as string);
      if (client) doc.clients = { company_name: client.company_name };
    }
    if (m.project_id) {
      const project = await getDoc("projects", m.project_id as string);
      if (project) doc.projects = { project_name: project.project_name };
    }
    return doc;
  }));

  return (
    <MeetingsDataTable
      columns={columns}
      data={enriched as unknown as Meeting[]}
    />
  );
}
