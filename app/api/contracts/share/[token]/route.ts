import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

// ─── GET — public endpoint, no auth required ────────────────────────
// Fetches a contract by share_token for the public viewer
export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;

  if (!token || token.length < 10)
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contracts")
    .select(
      "id,contract_type,title,client_name,pdf_url,status,created_at,expires_at"
    )
    .eq("share_token", token)
    .neq("status", "Archived")
    .single();

  if (error || !data)
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date())
    return NextResponse.json(
      { error: "This link has expired" },
      { status: 410 }
    );

  return NextResponse.json({ contract: data });
}
