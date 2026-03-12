import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { queryDocs, getDoc, insertDoc, updateDoc, deleteDoc, serializeDoc } from "@/lib/firebase/db";
import { logActivity } from "@/lib/activity-log";

function toText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}
function toDate(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
}
function toStatus(v: unknown): "Active" | "Expired" | "Pending Signature" {
  if (v === "Active" || v === "Expired" || v === "Pending Signature") return v;
  return "Pending Signature";
}

async function enrichAgreement(doc: Record<string, unknown>) {
  if (doc.client_id && !doc.client_name) {
    const client = await getDoc("clients", doc.client_id as string);
    if (client) doc.client_name = client.company_name;
  }
  return { ...doc, clients: doc.client_name ? { company_name: doc.client_name } : null };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await queryDocs("agreements", [], [{ field: "created_at", direction: "desc" }]);
    const enriched = await Promise.all(data.map((d) => enrichAgreement(serializeDoc(d))));
    return NextResponse.json({ agreements: enriched });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const client_id = toText(body?.client_id);
  const type = toText(body?.type);
  if (!client_id) return NextResponse.json({ error: "Client required" }, { status: 400 });
  if (!type) return NextResponse.json({ error: "Agreement type required" }, { status: 400 });

  let client_name: string | null = null;
  const client = await getDoc("clients", client_id);
  if (client) client_name = client.company_name as string;

  const payload: Record<string, unknown> = { client_id, client_name, type, status: "Pending Signature" };
  const expiry_date = toDate(body?.expiry_date);
  if (expiry_date) payload.expiry_date = expiry_date;
  const notes = toText(body?.notes);
  if (notes) payload.notes = notes;

  try {
    const data = await insertDoc("agreements", payload);

    await logActivity({
      userId, action: "Created", entityType: "agreement", entityId: data.id,
      details: { target_name: data.type as string, status: data.status as string },
    });

    const enriched = await enrichAgreement(serializeDoc(data));
    return NextResponse.json({ agreement: enriched }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = toText(body?.id);
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body?.status !== undefined) updates.status = toStatus(body.status);
  if (body?.signed_date !== undefined) updates.signed_date = toDate(body.signed_date);
  if (body?.document_link !== undefined) updates.document_link = toText(body.document_link);
  if (body?.expiry_date !== undefined) updates.expiry_date = toDate(body.expiry_date);
  if (body?.notes !== undefined) updates.notes = toText(body.notes);

  if (!Object.keys(updates).length)
    return NextResponse.json({ error: "No fields" }, { status: 400 });

  try {
    const data = await updateDoc("agreements", id, updates);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await logActivity({
      userId, action: "Updated", entityType: "agreement", entityId: data.id,
      details: { target_name: data.type as string, status: data.status as string },
    });

    const enriched = await enrichAgreement(serializeDoc(data));
    return NextResponse.json({ agreement: enriched });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = toText(body?.id);
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  try {
    const agreement = await getDoc("agreements", id);
    if (!agreement) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await deleteDoc("agreements", id);

    await logActivity({
      userId, action: "Deleted", entityType: "agreement", entityId: id,
      details: { target_name: agreement.type as string },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
