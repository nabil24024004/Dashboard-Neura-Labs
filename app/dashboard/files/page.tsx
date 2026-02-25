import { createAdminClient } from "@/lib/supabase/admin";
import { FileGrid, FileRecord } from "@/components/dashboard/files/file-grid";

export default async function FilesPage() {
  const supabase = createAdminClient();

  const [{ data: filesData, error }, { data: clientsData }] = await Promise.all([
    supabase
      .from("files")
      .select("id,client_id,project_id,file_name,file_url,file_type,file_size,uploaded_by,description,created_at,clients(company_name)")
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id,company_name").is("deleted_at", null).order("company_name"),
  ]);

  const safeFilesRows = error ? [] : (filesData ?? []);

  const files: FileRecord[] = safeFilesRows.map((f: any) => ({
    id: f.id,
    client_id: f.client_id,
    project_id: f.project_id,
    file_name: f.file_name,
    file_url: f.file_url,
    file_type: f.file_type,
    file_size: f.file_size ?? 0,
    uploaded_by: f.uploaded_by,
    description: f.description,
    created_at: f.created_at,
    clients: f.clients,
  }));

  const clients = (clientsData ?? []).map((c: any) => ({ id: c.id, company_name: c.company_name }));

  return <FileGrid files={files} clients={clients} />;
}
