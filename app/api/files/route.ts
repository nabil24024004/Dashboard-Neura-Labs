import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";

const FILE_COLUMNS =
  "id,client_id,project_id,file_name,file_url,file_type,file_size,uploaded_by,description,version,created_at,clients(company_name),projects(project_name)";

function normalizeText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("files")
    .select(FILE_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch files:", error.message);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }

  return NextResponse.json({ files: data ?? [] });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const file_name = normalizeText(body?.file_name);
  const file_url = normalizeText(body?.file_url);
  const file_type = normalizeText(body?.file_type);
  const client_id = normalizeText(body?.client_id);
  const client_name = normalizeText(body?.client_name);

  if (!file_name || !file_url || !file_type)
    return NextResponse.json({ error: "file_name, file_url, and file_type are required" }, { status: 400 });

  const supabase = createAdminClient();

  let resolvedClientId = client_id;
  if (!resolvedClientId && client_name) {
    const { data: matchedClient } = await supabase
      .from("clients")
      .select("id")
      .eq("company_name", client_name)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    resolvedClientId = matchedClient?.id ?? null;
  }

  const payload: Record<string, unknown> = {
    file_name,
    file_url,
    file_type,
    file_size: Number(body?.file_size) || 0,
    uploaded_by: userId,
  };
  if (resolvedClientId) payload.client_id = resolvedClientId;
  const project_id = normalizeText(body?.project_id);
  if (project_id) payload.project_id = project_id;
  const description = normalizeText(body?.description);
  if (description) payload.description = description;

  const { data, error } = await supabase.from("files").insert(payload).select(FILE_COLUMNS).single();

  if (error) {
    console.error("Failed to create file record:", error.message);
    return NextResponse.json({ error: `Failed to save file: ${error.message}` }, { status: 500 });
  }

  await logActivity({
    userId,
    action: "Uploaded",
    entityType: "file",
    entityId: data.id,
    details: { target_name: data.file_name, file_type: data.file_type },
  });

  return NextResponse.json({ file: data }, { status: 201 });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "File id required" }, { status: 400 });

  const supabase = createAdminClient();

  // Get the file to extract the storage path
  const { data: fileRec } = await supabase.from("files").select("file_url").eq("id", id).single();

  if (fileRec?.file_url) {
    // Attempt to remove from Supabase Storage (best-effort)
    const url = fileRec.file_url as string;
    const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (match) {
      const [, bucket, path] = match;
      await supabase.storage.from(bucket).remove([decodeURIComponent(path)]);
    }
  }

  const { data, error } = await supabase
    .from("files")
    .delete()
    .eq("id", id)
    .select("id,file_name")
    .single();
  if (error) return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });

  await logActivity({
    userId,
    action: "Deleted",
    entityType: "file",
    entityId: data.id,
    details: { target_name: data.file_name },
  });

  return NextResponse.json({ success: true });
}
