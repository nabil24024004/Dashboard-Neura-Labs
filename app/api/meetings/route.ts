import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { queryDocs, getDoc, insertDoc, updateDoc, deleteDoc, serializeDoc } from "@/lib/firebase/db";
import { logActivity } from "@/lib/activity-log";

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function normalizeDateTime(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function normalizeInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function enrichMeeting(doc: Record<string, unknown>) {
  if (doc.client_id && !doc.client_name) {
    const client = await getDoc("clients", doc.client_id as string);
    if (client) doc.client_name = client.company_name;
  }
  if (doc.project_id && !doc.project_name) {
    const project = await getDoc("projects", doc.project_id as string);
    if (project) doc.project_name = project.project_name;
  }
  return {
    ...doc,
    clients: doc.client_name ? { company_name: doc.client_name } : null,
    projects: doc.project_name ? { project_name: doc.project_name } : null,
  };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await queryDocs("meetings", [], [{ field: "scheduled_at", direction: "asc" }]);
    const enriched = await Promise.all(data.map((d) => enrichMeeting(serializeDoc(d))));
    return NextResponse.json({ meetings: enriched });
  } catch (error) {
    console.error("Failed to fetch meetings:", error);
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = normalizeText(body?.title);
  const client_id = normalizeText(body?.client_id);
  const scheduled_at = normalizeDateTime(body?.scheduled_at);

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!client_id) return NextResponse.json({ error: "Client is required" }, { status: 400 });
  if (!scheduled_at) return NextResponse.json({ error: "Valid date/time is required" }, { status: 400 });

  // Denormalize names
  let client_name: string | null = null;
  const client = await getDoc("clients", client_id);
  if (client) client_name = client.company_name as string;

  const payload: Record<string, unknown> = {
    title,
    client_id,
    client_name,
    scheduled_at,
    status: "Scheduled",
  };

  const project_id = normalizeText(body?.project_id);
  if (project_id) {
    payload.project_id = project_id;
    const project = await getDoc("projects", project_id);
    if (project) payload.project_name = project.project_name;
  }
  const duration = normalizeInt(body?.duration_minutes);
  if (duration) payload.duration_minutes = duration;
  const platform = normalizeText(body?.platform);
  if (platform) payload.platform = platform;
  const meeting_url = normalizeText(body?.meeting_url);
  if (meeting_url) payload.meeting_url = meeting_url;
  const agenda = normalizeText(body?.agenda);
  if (agenda) payload.agenda = agenda;

  try {
    const data = await insertDoc("meetings", payload);

    await logActivity({
      userId,
      action: "Scheduled",
      entityType: "meeting",
      entityId: data.id,
      details: { target_name: data.title as string, status: data.status as string },
    });

    const enriched = await enrichMeeting(serializeDoc(data));
    return NextResponse.json({ meeting: enriched }, { status: 201 });
  } catch (error) {
    console.error("Failed to create meeting:", error);
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "Meeting id is required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body?.title !== undefined) updates.title = normalizeText(body.title);
  if (body?.status !== undefined) updates.status = normalizeText(body.status);
  if (body?.scheduled_at !== undefined) updates.scheduled_at = normalizeDateTime(body.scheduled_at);
  if (body?.meeting_url !== undefined) updates.meeting_url = normalizeText(body.meeting_url);
  if (body?.platform !== undefined) updates.platform = normalizeText(body.platform);
  if (body?.agenda !== undefined) updates.agenda = normalizeText(body.agenda);
  if (body?.duration_minutes !== undefined) updates.duration_minutes = normalizeInt(body.duration_minutes);

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "No fields provided" }, { status: 400 });

  try {
    const data = await updateDoc("meetings", id, updates);
    if (!data) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

    await logActivity({
      userId,
      action: "Updated",
      entityType: "meeting",
      entityId: data.id,
      details: { target_name: data.title as string, status: data.status as string },
    });

    const enriched = await enrichMeeting(serializeDoc(data));
    return NextResponse.json({ meeting: enriched });
  } catch (error) {
    console.error("Failed to update meeting:", error);
    return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "Meeting id is required" }, { status: 400 });

  try {
    const meeting = await getDoc("meetings", id);
    if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

    await deleteDoc("meetings", id);

    await logActivity({
      userId,
      action: "Deleted",
      entityType: "meeting",
      entityId: id,
      details: { target_name: meeting.title as string },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete meeting:", error);
    return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 });
  }
}
