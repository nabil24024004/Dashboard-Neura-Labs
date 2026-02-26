import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";

const AGR_COLUMNS =
  "id,client_id,type,signed_date,expiry_date,document_link,status,notes,created_at,clients(company_name)";

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

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agreements")
    .select(AGR_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  return NextResponse.json({ agreements: data ?? [] });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const client_id = toText(body?.client_id);
  const type = toText(body?.type);
  if (!client_id) return NextResponse.json({ error: "Client required" }, { status: 400 });
  if (!type) return NextResponse.json({ error: "Agreement type required" }, { status: 400 });

  const supabase = createAdminClient();
  const payload: Record<string, unknown> = {
    client_id,
    type,
    status: "Pending Signature",
  };
  const expiry_date = toDate(body?.expiry_date);
  if (expiry_date) payload.expiry_date = expiry_date;
  const notes = toText(body?.notes);
  if (notes) payload.notes = notes;

  const { data, error } = await supabase
    .from("agreements")
    .insert(payload)
    .select(AGR_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: `Failed to create: ${error.message}` }, { status: 500 });

  await logActivity({
    userId,
    action: "Created",
    entityType: "agreement",
    entityId: data.id,
    details: { target_name: data.type, status: data.status },
  });

  return NextResponse.json({ agreement: data }, { status: 201 });
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

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agreements")
    .update(updates)
    .eq("id", id)
    .select(AGR_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  await logActivity({
    userId,
    action: "Updated",
    entityType: "agreement",
    entityId: data.id,
    details: { target_name: data.type, status: data.status },
  });

  return NextResponse.json({ agreement: data });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = toText(body?.id);
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agreements")
    .delete()
    .eq("id", id)
    .select("id,type")
    .single();
  if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });

  await logActivity({
    userId,
    action: "Deleted",
    entityType: "agreement",
    entityId: data.id,
    details: { target_name: data.type },
  });

  return NextResponse.json({ success: true });
}
