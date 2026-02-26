import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const CONTRACT_COLUMNS =
  "id,contract_type,title,client_name,client_email,field_values,pdf_url,share_token,status,created_by,created_at,updated_at,expires_at";

function toText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function getStorageTargetFromPublicUrl(url: string) {
  try {
    const path = new URL(url).pathname;
    const match = path.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!match) return null;
    return {
      bucket: match[1],
      objectPath: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}

type Params = { params: Promise<{ id: string }> };

// ─── GET — single contract ──────────────────────────────────────────
export async function GET(_req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contracts")
    .select(CONTRACT_COLUMNS)
    .eq("id", id)
    .single();

  if (error || !data)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ contract: data });
}

// ─── PATCH — update status, pdf_url, etc. ───────────────────────────
export async function PATCH(req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) {
    const validStatuses = ["Draft", "Sent", "Signed"];
    if (!validStatuses.includes(body.status))
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    updates.status = body.status;
  }

  if (body.pdf_url !== undefined) updates.pdf_url = toText(body.pdf_url);
  if (body.client_email !== undefined)
    updates.client_email = toText(body.client_email);
  if (body.title !== undefined) updates.title = toText(body.title);
  if (body.expires_at !== undefined) updates.expires_at = body.expires_at;
  if (body.field_values !== undefined) updates.field_values = body.field_values;

  if (!Object.keys(updates).length)
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  updates.updated_at = new Date().toISOString();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contracts")
    .update(updates)
    .eq("id", id)
    .select(CONTRACT_COLUMNS)
    .single();

  if (error)
    return NextResponse.json(
      { error: `Failed to update: ${error.message}` },
      { status: 500 }
    );

  return NextResponse.json({ contract: data });
}

// ─── DELETE — hard delete contract + stored PDF ─────────────────────
export async function DELETE(_req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: contract, error: fetchError } = await supabase
    .from("contracts")
    .select("id,pdf_url")
    .eq("id", id)
    .single();

  if (fetchError || !contract)
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });

  const pdfUrl = toText(contract.pdf_url);
  if (pdfUrl) {
    const storageTarget = getStorageTargetFromPublicUrl(pdfUrl);
    if (storageTarget) {
      const { error: storageError } = await supabase.storage
        .from(storageTarget.bucket)
        .remove([storageTarget.objectPath]);

      if (storageError) {
        return NextResponse.json(
          {
            error: `Failed to delete PDF from storage: ${storageError.message}`,
          },
          { status: 500 }
        );
      }
    }

    const { error: filesDeleteError } = await supabase
      .from("files")
      .delete()
      .eq("file_url", pdfUrl);

    if (filesDeleteError) {
      console.error(
        "Failed to delete related files rows:",
        filesDeleteError.message
      );
    }
  }

  const { error: deleteError } = await supabase
    .from("contracts")
    .delete()
    .eq("id", id);

  if (deleteError)
    return NextResponse.json(
      { error: `Failed to delete contract: ${deleteError.message}` },
      { status: 500 }
    );

  return NextResponse.json({ success: true });
}
