import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { queryDocs, insertDoc, updateDoc, getDoc, deleteDoc, serializeDoc } from "@/lib/firebase/db";
import { logActivity } from "@/lib/activity-log";

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await queryDocs("integrations");
    return NextResponse.json({ integrations: data.map(serializeDoc) });
  } catch (error) {
    console.error("Failed to fetch integrations:", error);
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = normalizeText(body?.name);
  if (!name) return NextResponse.json({ error: "Integration name is required" }, { status: 400 });

  const payload: Record<string, unknown> = {
    name,
    description: normalizeText(body?.description) ?? "",
    category: normalizeText(body?.category) ?? "General",
    status: "Disconnected",
  };

  const webhook_url = normalizeText(body?.webhook_url);
  if (webhook_url) payload.webhook_url = webhook_url;
  const api_key = normalizeText(body?.api_key);
  if (api_key) payload.api_key = api_key;
  if (body?.config && typeof body.config === "object") payload.config = body.config;

  try {
    const data = await insertDoc("integrations", payload);

    await logActivity({
      userId, action: "Created", entityType: "integration", entityId: data.id,
      details: { target_name: data.name as string, status: data.status as string },
    });

    return NextResponse.json({ integration: serializeDoc(data) }, { status: 201 });
  } catch (error) {
    console.error("Failed to create integration:", error);
    return NextResponse.json({ error: "Failed to create integration" }, { status: 500 });
  }
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

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  try {
    const data = await updateDoc("integrations", id, updates);
    if (!data) return NextResponse.json({ error: "Integration not found" }, { status: 404 });

    await logActivity({
      userId, action: "Updated", entityType: "integration", entityId: data.id,
      details: { target_name: data.name as string, status: data.status as string },
    });

    return NextResponse.json({ integration: serializeDoc(data) });
  } catch (error) {
    console.error("Failed to update integration:", error);
    return NextResponse.json({ error: "Failed to update integration" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "Integration id required" }, { status: 400 });

  try {
    const integration = await getDoc("integrations", id);
    if (!integration) return NextResponse.json({ error: "Integration not found" }, { status: 404 });

    await deleteDoc("integrations", id);

    await logActivity({
      userId, action: "Deleted", entityType: "integration", entityId: id,
      details: { target_name: integration.name as string },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete integration:", error);
    return NextResponse.json({ error: "Failed to delete integration" }, { status: 500 });
  }
}
