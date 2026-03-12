import { queryDocs, getDoc, serializeDoc } from "@/lib/firebase/db";
import { FileGrid, FileRecord } from "@/components/dashboard/files/file-grid";

export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const [filesData, clientsData] = await Promise.all([
    queryDocs("files", [], [{ field: "created_at", direction: "desc" }]),
    queryDocs("clients", [{ field: "deleted_at", op: "==", value: null }]),
  ]);

  const files: FileRecord[] = await Promise.all(
    filesData.map(async (f) => {
      const d = serializeDoc(f);
      let clients = null;
      if (d.client_id) {
        const client = await getDoc("clients", d.client_id as string);
        if (client) clients = { company_name: client.company_name };
      }
      return {
        id: d.id,
        client_id: d.client_id,
        project_id: d.project_id,
        file_name: d.file_name,
        file_url: d.file_url,
        file_type: d.file_type,
        file_size: d.file_size ?? 0,
        uploaded_by: d.uploaded_by,
        description: d.description,
        created_at: d.created_at,
        clients,
      } as FileRecord;
    })
  );

  const clients = clientsData
    .map((c) => ({ id: c.id, company_name: c.company_name as string }))
    .sort((a, b) => a.company_name.localeCompare(b.company_name));

  return <FileGrid files={files} clients={clients} />;
}
