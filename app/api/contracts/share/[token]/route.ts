import { NextResponse } from "next/server";
import { queryDocs, serializeDoc } from "@/lib/firebase/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

// ─── GET — public endpoint, no auth required ────────────────────────
export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;

  if (!token || token.length < 10)
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  try {
    const results = await queryDocs(
      "contracts",
      [
        { field: "share_token", op: "==", value: token },
        { field: "status", op: "!=", value: "Archived" },
      ],
      [],
      1
    );

    if (results.length === 0)
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });

    const data = serializeDoc(results[0]);

    // Check expiry
    if (data.expires_at && new Date(data.expires_at as string) < new Date())
      return NextResponse.json({ error: "This link has expired" }, { status: 410 });

    // Only return safe public fields
    return NextResponse.json({
      contract: {
        id: data.id,
        contract_type: data.contract_type,
        title: data.title,
        client_name: data.client_name,
        pdf_url: data.pdf_url,
        status: data.status,
        created_at: data.created_at,
        expires_at: data.expires_at,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }
}
