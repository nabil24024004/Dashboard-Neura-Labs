import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";

const PROJECT_COLUMNS =
  "id,client_id,project_name,service_type,status,deadline,budget,progress,description,assigned_team,created_at,clients(company_name)";

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function normalizeStatus(
  value: unknown
): "Lead" | "Planning" | "In Progress" | "Review" | "Completed" | "On Hold" {
  const valid = ["Lead", "Planning", "In Progress", "Review", "Completed", "On Hold"];
  if (typeof value === "string" && valid.includes(value))
    return value as "Lead" | "Planning" | "In Progress" | "Review" | "Completed" | "On Hold";
  return "Planning";
}

function normalizeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0]; // date only: YYYY-MM-DD
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch projects:", error.message);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }

  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const project_name = normalizeText(body?.project_name);
  const client_id = normalizeText(body?.client_id);
  const service_type = normalizeText(body?.service_type);

  if (!project_name) return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  if (!client_id) return NextResponse.json({ error: "Client is required" }, { status: 400 });
  if (!service_type) return NextResponse.json({ error: "Service type is required" }, { status: 400 });

  const payload: Record<string, unknown> = {
    project_name,
    client_id,
    service_type,
    status: normalizeStatus(body?.status),
    progress: 0,
  };

  const deadline = normalizeDate(body?.deadline);
  if (deadline) payload.deadline = deadline;
  const budget = normalizeNumber(body?.budget);
  if (budget !== null) payload.budget = budget;
  const description = normalizeText(body?.description);
  if (description) payload.description = description;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .insert(payload)
    .select(PROJECT_COLUMNS)
    .single();

  if (error) {
    console.error("Failed to create project:", error.message);
    return NextResponse.json({ error: `Failed to create project: ${error.message}` }, { status: 500 });
  }

  await logActivity({
    userId,
    action: "Created",
    entityType: "project",
    entityId: data.id,
    details: { target_name: data.project_name },
  });

  return NextResponse.json({ project: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "Project id is required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body?.project_name !== undefined) updates.project_name = normalizeText(body.project_name);
  if (body?.service_type !== undefined) updates.service_type = normalizeText(body.service_type);
  if (body?.status !== undefined) updates.status = normalizeStatus(body.status);
  if (body?.deadline !== undefined) updates.deadline = normalizeDate(body.deadline);
  if (body?.budget !== undefined) updates.budget = normalizeNumber(body.budget);
  if (body?.description !== undefined) updates.description = normalizeText(body.description);
  if (body?.progress !== undefined) {
    const p = normalizeNumber(body.progress);
    if (p !== null) updates.progress = Math.min(100, Math.max(0, p));
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "No fields provided" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select(PROJECT_COLUMNS)
    .single();

  if (error) {
    console.error("Failed to update project:", error.message);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }

  await logActivity({
    userId,
    action: "Updated",
    entityType: "project",
    entityId: data.id,
    details: { target_name: data.project_name, status: data.status },
  });

  return NextResponse.json({ project: data });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "Project id is required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .select("id,project_name")
    .single();

  if (error) {
    console.error("Failed to delete project:", error.message);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }

  await logActivity({
    userId,
    action: "Deleted",
    entityType: "project",
    entityId: data.id,
    details: { target_name: data.project_name },
  });

  return NextResponse.json({ success: true });
}
