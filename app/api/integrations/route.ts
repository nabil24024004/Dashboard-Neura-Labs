import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

const INTEGRATION_COLUMNS = "*";

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("integrations")
    .select(INTEGRATION_COLUMNS);

  if (error) {
    console.error("Failed to fetch integrations:", error.message);
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 });
  }

  return NextResponse.json({ integrations: data ?? [] });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = normalizeText(body?.name);
  if (!name) return NextResponse.json({ error: "Integration name is required" }, { status: 400 });

  const description = normalizeText(body?.description) ?? "";
  const category = normalizeText(body?.category) ?? "General";
  const webhook_url = normalizeText(body?.webhook_url);
  const api_key = normalizeText(body?.api_key);

  const payload: Record<string, unknown> = {
    name,
    description,
    category,
    status: "Disconnected",
  };

  if (webhook_url) payload.webhook_url = webhook_url;
  if (api_key) payload.api_key = api_key;
  if (body?.config && typeof body.config === "object") payload.config = body.config;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("integrations")
    .insert(payload)
    .select(INTEGRATION_COLUMNS)
    .single();

  if (error) {
    console.error("Failed to create integration:", error.message);
    return NextResponse.json({ error: `Failed to create integration: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ integration: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "Integration id required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body?.name !== undefined) updates.name = normalizeText(body.name);
  if (body?.description !== undefined) updates.description = normalizeText(body.description);
  if (body?.category !== undefined) updates.category = normalizeText(body.category);
  if (body?.status !== undefined) {
    const validStatuses = ["Connected", "Disconnected", "Pending"];
    updates.status = validStatuses.includes(body.status) ? body.status : "Disconnected";
  }
  if (body?.webhook_url !== undefined) updates.webhook_url = normalizeText(body.webhook_url);
  if (body?.api_key !== undefined) updates.api_key = normalizeText(body.api_key);
  if (body?.config !== undefined) updates.config = body.config;
  if (body?.last_sync !== undefined) updates.last_sync = body.last_sync;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("integrations")
    .update(updates)
    .eq("id", id)
    .select(INTEGRATION_COLUMNS)
    .single();

  if (error) {
    console.error("Failed to update integration:", error.message);
    return NextResponse.json({ error: "Failed to update integration" }, { status: 500 });
  }

  return NextResponse.json({ integration: data });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "Integration id required" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.from("integrations").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete integration:", error.message);
    return NextResponse.json({ error: "Failed to delete integration" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
