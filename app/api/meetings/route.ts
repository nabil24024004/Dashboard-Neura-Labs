import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";

const MEETING_COLUMNS =
  "id,client_id,project_id,title,scheduled_at,duration_minutes,platform,meeting_url,agenda,status,created_at,clients(company_name),projects(project_name)";

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

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("meetings")
    .select(MEETING_COLUMNS)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch meetings:", error.message);
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
  }

  return NextResponse.json({ meetings: data ?? [] });
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

  const payload: Record<string, unknown> = {
    title,
    client_id,
    scheduled_at,
    status: "Scheduled",
  };

  const project_id = normalizeText(body?.project_id);
  if (project_id) payload.project_id = project_id;
  const duration = normalizeInt(body?.duration_minutes);
  if (duration) payload.duration_minutes = duration;
  const platform = normalizeText(body?.platform);
  if (platform) payload.platform = platform;
  const meeting_url = normalizeText(body?.meeting_url);
  if (meeting_url) payload.meeting_url = meeting_url;
  const agenda = normalizeText(body?.agenda);
  if (agenda) payload.agenda = agenda;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("meetings")
    .insert(payload)
    .select(MEETING_COLUMNS)
    .single();

  if (error) {
    console.error("Failed to create meeting:", error.message);
    return NextResponse.json({ error: `Failed to create meeting: ${error.message}` }, { status: 500 });
  }

  await logActivity({
    userId,
    action: "Scheduled",
    entityType: "meeting",
    entityId: data.id,
    details: { target_name: data.title, status: data.status },
  });

  return NextResponse.json({ meeting: data }, { status: 201 });
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

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("meetings")
    .update(updates)
    .eq("id", id)
    .select(MEETING_COLUMNS)
    .single();

  if (error) {
    console.error("Failed to update meeting:", error.message);
    return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 });
  }

  await logActivity({
    userId,
    action: "Updated",
    entityType: "meeting",
    entityId: data.id,
    details: { target_name: data.title, status: data.status },
  });

  return NextResponse.json({ meeting: data });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "Meeting id is required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("meetings")
    .delete()
    .eq("id", id)
    .select("id,title")
    .single();

  if (error) {
    console.error("Failed to delete meeting:", error.message);
    return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 });
  }

  await logActivity({
    userId,
    action: "Deleted",
    entityType: "meeting",
    entityId: data.id,
    details: { target_name: data.title },
  });

  return NextResponse.json({ success: true });
}
