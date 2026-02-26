import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";

const CLIENT_COLUMNS = "id,company_name,contact_person,email,phone,country,status,notes,created_at";

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function normalizeStatus(value: unknown): "Active" | "Inactive" | "Lead" {
  if (value === "Active" || value === "Inactive" || value === "Lead") return value;
  return "Lead";
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_COLUMNS)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch clients:", error.message);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }

  return NextResponse.json({ clients: data ?? [] });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const company_name = normalizeText(body?.company_name);
  const contact_person = normalizeText(body?.contact_person);

  if (!company_name) return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  if (!contact_person) return NextResponse.json({ error: "Contact person is required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      company_name,
      contact_person,
      email: normalizeText(body?.email),
      phone: normalizeText(body?.phone),
      country: normalizeText(body?.country),
      status: normalizeStatus(body?.status),
      notes: normalizeText(body?.notes),
    })
    .select(CLIENT_COLUMNS)
    .single();

  if (error) {
    console.error("Failed to create client:", error.message);
    return NextResponse.json({ error: `Failed to create client: ${error.message}` }, { status: 500 });
  }

  await logActivity({
    userId,
    action: "Created",
    entityType: "client",
    entityId: data.id,
    details: { target_name: data.company_name },
  });

  return NextResponse.json({ client: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "Client id is required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body?.company_name !== undefined) updates.company_name = normalizeText(body.company_name);
  if (body?.contact_person !== undefined) updates.contact_person = normalizeText(body.contact_person);
  if (body?.email !== undefined) updates.email = normalizeText(body.email);
  if (body?.phone !== undefined) updates.phone = normalizeText(body.phone);
  if (body?.country !== undefined) updates.country = normalizeText(body.country);
  if (body?.status !== undefined) updates.status = normalizeStatus(body.status);
  if (body?.notes !== undefined) updates.notes = normalizeText(body.notes);

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "No fields provided" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", id)
    .select(CLIENT_COLUMNS)
    .single();

  if (error) {
    console.error("Failed to update client:", error.message);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }

  await logActivity({
    userId,
    action: "Updated",
    entityType: "client",
    entityId: data.id,
    details: { target_name: data.company_name },
  });

  return NextResponse.json({ client: data });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "Client id is required" }, { status: 400 });

  // Soft delete
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id,company_name")
    .single();

  if (error) {
    console.error("Failed to delete client:", error.message);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }

  await logActivity({
    userId,
    action: "Archived",
    entityType: "client",
    entityId: data.id,
    details: { target_name: data.company_name },
  });

  return NextResponse.json({ success: true });
}
