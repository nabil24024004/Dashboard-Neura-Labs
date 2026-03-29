import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { queryDocs, getDoc, insertDoc, deleteDoc, serializeDoc } from "@/lib/firebase/db";
import { deleteFromR2, getR2KeyFromUrl } from "@/lib/r2/client";
import { logActivity } from "@/lib/activity-log";

function normalizeText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

async function enrichFile(doc: Record<string, unknown>) {
  if (doc.client_id && !doc.client_name) {
    const client = await getDoc("clients", doc.client_id as string);
    if (client) doc.client_name = client.company_name;
  }
  if (doc.project_id && !doc.project_name) {
    const project = await getDoc("projects", doc.project_id as string);
    if (project) doc.project_name = project.project_name;
  }
  return {
    ...doc,
    owner_type: doc.owner_type ?? (doc.client_id ? "client" : null),
    agency_label: doc.agency_label ?? null,
    clients: doc.client_name ? { company_name: doc.client_name } : null,
    projects: doc.project_name ? { project_name: doc.project_name } : null,
  };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await queryDocs("files", [], [{ field: "created_at", direction: "desc" }]);
    const enriched = await Promise.all(data.map((d) => enrichFile(serializeDoc(d))));
    return NextResponse.json({ files: enriched });
  } catch (error) {
    console.error("Failed to fetch files:", error);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const file_name = normalizeText(body?.file_name);
  const file_url = normalizeText(body?.file_url);
  const file_type = normalizeText(body?.file_type);
  const client_id = normalizeText(body?.client_id);
  const client_name_input = normalizeText(body?.client_name);
  const owner_type = normalizeText(body?.owner_type) ?? "client";
  const agency_label = normalizeText(body?.agency_label);

  if (!file_name || !file_url || !file_type)
    return NextResponse.json({ error: "file_name, file_url, and file_type are required" }, { status: 400 });

  let resolvedClientId = client_id;
  let resolvedClientName: string | null = null;

  // If client_name provided but no ID, look up the client
  if (!resolvedClientId && client_name_input) {
    const clients = await queryDocs("clients", [
      { field: "company_name", op: "==", value: client_name_input },
      { field: "deleted_at", op: "==", value: null },
    ], [], 1);
    if (clients.length > 0) {
      resolvedClientId = clients[0].id;
      resolvedClientName = clients[0].company_name as string;
    }
  } else if (resolvedClientId) {
    const client = await getDoc("clients", resolvedClientId);
    if (client) resolvedClientName = client.company_name as string;
  }

  const payload: Record<string, unknown> = {
    file_name,
    file_url,
    file_type,
    file_size: Number(body?.file_size) || 0,
    uploaded_by: userId,
    owner_type,
  };
  if (owner_type === "agency" && agency_label) {
    payload.agency_label = agency_label;
  }
  if (resolvedClientId) {
    payload.client_id = resolvedClientId;
    payload.client_name = resolvedClientName;
  }
  const project_id = normalizeText(body?.project_id);
  if (project_id) {
    payload.project_id = project_id;
    const project = await getDoc("projects", project_id);
    if (project) payload.project_name = project.project_name;
  }
  const description = normalizeText(body?.description);
  if (description) payload.description = description;

  try {
    const data = await insertDoc("files", payload);

    await logActivity({
      userId,
      action: "Uploaded",
      entityType: "file",
      entityId: data.id,
      details: { target_name: data.file_name as string, file_type: data.file_type },
    });

    const enriched = await enrichFile(serializeDoc(data));
    return NextResponse.json({ file: enriched }, { status: 201 });
  } catch (error) {
    console.error("Failed to create file record:", error);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "File id required" }, { status: 400 });

  try {
    const fileRec = await getDoc("files", id);
    if (!fileRec) return NextResponse.json({ error: "File not found" }, { status: 404 });

    // Attempt to remove from R2 (best-effort)
    if (fileRec.file_url) {
      const r2Key = getR2KeyFromUrl(fileRec.file_url as string);
      if (r2Key) {
        try { await deleteFromR2(r2Key); } catch (e) { console.error("R2 delete error:", e); }
      }
    }

    await deleteDoc("files", id);

    await logActivity({
      userId,
      action: "Deleted",
      entityType: "file",
      entityId: id,
      details: { target_name: fileRec.file_name as string },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete file:", error);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
