import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { queryDocs, insertDoc, updateDoc, serializeDoc } from "@/lib/firebase/db";
import { logActivity } from "@/lib/activity-log";

const TASK_FIELDS = ["id", "title", "assigned_to", "project_id", "priority", "deadline", "status", "description", "created_at"];
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
  return parsed.toISOString().split("T")[0];
}

function pickFields(doc: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const key of TASK_FIELDS) {
    if (key in doc) result[key] = doc[key];
  }
  return result;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await queryDocs(
      "tasks",
      [],
      [{ field: "created_at", direction: "desc" }]
    );

    return NextResponse.json({ tasks: data.map((d) => pickFields(serializeDoc(d))) });
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = normalizeText(body?.title);
  if (!title) return NextResponse.json({ error: "Task title is required" }, { status: 400 });

  const insertPayload: Record<string, unknown> = {
    title,
    priority: normalizePriority(body?.priority),
    status: "To Do",
  };

  const deadline = normalizeDeadline(body?.dueDate);
  if (deadline) insertPayload.deadline = deadline;

  try {
    const data = await insertDoc("tasks", insertPayload);

    await logActivity({
      userId,
      action: "Created",
      entityType: "task",
      entityId: data.id,
      details: { target_name: data.title as string },
    });

    return NextResponse.json({ task: pickFields(serializeDoc(data)) }, { status: 201 });
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "Task id is required" }, { status: 400 });

  const updates: Record<string, unknown> = {};

  if (body?.status !== undefined) updates.status = normalizeStatus(body.status);
  if (typeof body?.is_completed === "boolean") {
    updates.status = body.is_completed ? "Done" : "To Do";
  }
  if (body?.title !== undefined) updates.title = normalizeText(body.title);
  if (body?.priority !== undefined) updates.priority = normalizePriority(body.priority);
  if (body?.dueDate !== undefined) updates.deadline = normalizeDeadline(body.dueDate);
  if (body?.description !== undefined) updates.description = normalizeText(body.description);

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });

  if (updates.title === null)
    return NextResponse.json({ error: "Task title cannot be empty" }, { status: 400 });

  try {
    const data = await updateDoc("tasks", id, updates);
    if (!data) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    await logActivity({
      userId,
      action: "Updated",
      entityType: "task",
      entityId: data.id,
      details: { target_name: data.title as string, status: data.status as string },
    });

    return NextResponse.json({ task: pickFields(serializeDoc(data)) });
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "Task id is required" }, { status: 400 });

  try {
    const { getDoc } = await import("@/lib/firebase/db");
    const task = await getDoc("tasks", id);
    if (!task) return NextResponse.json({ error: "Task not found or already deleted" }, { status: 404 });

    const { deleteDoc: delDoc } = await import("@/lib/firebase/db");
    await delDoc("tasks", id);

    await logActivity({
      userId,
      action: "Deleted",
      entityType: "task",
      entityId: id,
      details: { target_name: `Task ${id.slice(0, 8)}` },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete task:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
