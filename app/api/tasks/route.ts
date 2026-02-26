import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";

const TASK_COLUMNS = "id,title,assigned_to,project_id,priority,deadline,status,description,created_at";
const ALLOWED_PRIORITIES = new Set(["Urgent", "High", "Medium", "Low"]);
const ALLOWED_STATUSES = new Set(["To Do", "In Progress", "In Review", "Done"]);

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePriority(value: unknown): "Urgent" | "High" | "Medium" | "Low" {
  if (typeof value !== "string" || !ALLOWED_PRIORITIES.has(value)) return "Medium";
  return value as "Urgent" | "High" | "Medium" | "Low";
}

function normalizeStatus(value: unknown): "To Do" | "In Progress" | "In Review" | "Done" {
  if (typeof value !== "string" || !ALLOWED_STATUSES.has(value)) return "To Do";
  return value as "To Do" | "In Progress" | "In Review" | "Done";
}

function normalizeDeadline(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  // Store as ISO date string (YYYY-MM-DD) since the column is type 'date'
  return parsed.toISOString().split("T")[0];
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .order("deadline", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch tasks:", error.message, "Code:", error.code);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }

  return NextResponse.json({ tasks: data ?? [] });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const title = normalizeText(body?.title);

  if (!title) {
    return NextResponse.json({ error: "Task title is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Build a minimal payload — only send fields with actual values
  const insertPayload: Record<string, unknown> = {
    title,
    priority: normalizePriority(body?.priority),
  };

  const deadline = normalizeDeadline(body?.dueDate);
  if (deadline) insertPayload.deadline = deadline;

  const { data, error } = await supabase
    .from("tasks")
    .insert(insertPayload)
    .select("id,title")
    .single();

  if (error) {
    console.error("Failed to create task:", JSON.stringify(error));
    return NextResponse.json(
      { error: `Failed to create task: ${error.message} (${error.code})` },
      { status: 500 }
    );
  }

  await logActivity({
    userId,
    action: "Created",
    entityType: "task",
    entityId: data.id,
    details: { target_name: data.title },
  });

  // Return success — the client will refetch the full task list
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) {
    return NextResponse.json({ error: "Task id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body?.status !== undefined) {
    updates.status = normalizeStatus(body.status);
  }
  // Support toggling completion via is_completed boolean from the panel
  if (typeof body?.is_completed === "boolean") {
    updates.status = body.is_completed ? "Done" : "To Do";
  }
  if (body?.title !== undefined) {
    updates.title = normalizeText(body.title);
  }
  if (body?.priority !== undefined) {
    updates.priority = normalizePriority(body.priority);
  }
  if (body?.dueDate !== undefined) {
    updates.deadline = normalizeDeadline(body.dueDate);
  }
  if (body?.description !== undefined) {
    updates.description = normalizeText(body.description);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  if (updates.title === null) {
    return NextResponse.json({ error: "Task title cannot be empty" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select(TASK_COLUMNS)
    .single();

  if (error) {
    console.error("Failed to update task:", error.message, "Code:", error.code);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }

  await logActivity({
    userId,
    action: "Updated",
    entityType: "task",
    entityId: data.id,
    details: { target_name: data.title, status: data.status },
  });

  return NextResponse.json({ task: data });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) {
    return NextResponse.json({ error: "Task id is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Use .select() to verify the row was actually deleted
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("Failed to delete task:", error.message, "Code:", error.code);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }

  if (!data || data.length === 0) {
    console.error("Task delete returned 0 rows for id:", id);
    // Row not found or RLS blocked — try a hard delete without RLS check
    // This shouldn't happen with admin client but log it for debugging
    return NextResponse.json({ error: "Task not found or already deleted" }, { status: 404 });
  }

  await logActivity({
    userId,
    action: "Deleted",
    entityType: "task",
    entityId: data[0].id,
    details: { target_name: `Task ${data[0].id.slice(0, 8)}` },
  });

  return NextResponse.json({ success: true });
}
