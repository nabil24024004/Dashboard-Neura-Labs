import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

const CONTRACT_COLUMNS =
  "id,contract_type,title,client_name,client_email,field_values,pdf_url,share_token,status,created_by,created_at,updated_at,expires_at";

function toText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

// ─── GET — list all contracts ────────────────────────────────────────
export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contracts")
    .select(CONTRACT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json(
      { error: `Failed to fetch: ${error.message}` },
      { status: 500 }
    );

  return NextResponse.json({ contracts: data ?? [] });
}

// ─── POST — create a new contract ───────────────────────────────────
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const contract_type = toText(body.contract_type);
  const title = toText(body.title);
  const client_name = toText(body.client_name);

  if (!contract_type)
    return NextResponse.json(
      { error: "Contract type is required" },
      { status: 400 }
    );
  if (!title)
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 }
    );

  // Generate a cryptographically random share token
  const share_token = crypto.randomUUID();

  const payload: Record<string, unknown> = {
    contract_type,
    title,
    client_name: client_name ?? "",
    client_email: toText(body.client_email) ?? null,
    field_values: body.field_values ?? {},
    pdf_url: toText(body.pdf_url) ?? null,
    share_token,
    status: body.status ?? "Draft",
    created_by: userId,
  };

  if (body.expires_at) {
    payload.expires_at = body.expires_at;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contracts")
    .insert(payload)
    .select(CONTRACT_COLUMNS)
    .single();

  if (error)
    return NextResponse.json(
      { error: `Failed to create: ${error.message}` },
      { status: 500 }
    );

  await logActivity({
    userId,
    action: "Created",
    entityType: "contract",
    entityId: data.id,
    details: { target_name: data.title, status: data.status },
  });

  return NextResponse.json({ contract: data }, { status: 201 });
}
