import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDoc, updateDoc, deleteDoc, deleteDocs, serializeDoc } from "@/lib/firebase/db";
import { deleteFromR2, getR2KeyFromUrl } from "@/lib/r2/client";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

function toText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

type Params = { params: Promise<{ id: string }> };

// ─── GET — single contract ──────────────────────────────────────────
export async function GET(_req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const data = await getDoc("contracts", id);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ contract: serializeDoc(data) });
  } catch (error) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

// ─── PATCH — update status, pdf_url, etc. ───────────────────────────
export async function PATCH(req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

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
  if (body.client_email !== undefined) updates.client_email = toText(body.client_email);
  if (body.title !== undefined) updates.title = toText(body.title);
  if (body.expires_at !== undefined) updates.expires_at = body.expires_at;
  if (body.field_values !== undefined) updates.field_values = body.field_values;

  if (!Object.keys(updates).length)
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  updates.updated_at = new Date().toISOString();

  try {
    const data = await updateDoc("contracts", id, updates);
    if (!data) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

    await logActivity({
      userId, action: "Updated", entityType: "contract", entityId: data.id,
      details: { target_name: data.title as string, status: data.status as string },
    });

    return NextResponse.json({ contract: serializeDoc(data) });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// ─── DELETE — hard delete contract + stored PDF ─────────────────────
export async function DELETE(_req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const contract = await getDoc("contracts", id);
    if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

    // Delete PDF from R2 if it exists
    const pdfUrl = toText(contract.pdf_url);
    if (pdfUrl) {
      const r2Key = getR2KeyFromUrl(pdfUrl);
      if (r2Key) {
        try { await deleteFromR2(r2Key); } catch (e) { console.error("R2 PDF delete error:", e); }
      }

      // Delete related file records
      await deleteDocs("files", [{ field: "file_url", op: "==", value: pdfUrl }]);
    }

    await deleteDoc("contracts", id);

    await logActivity({
      userId, action: "Deleted", entityType: "contract", entityId: id,
      details: { target_name: contract.title as string },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete contract" }, { status: 500 });
  }
}
