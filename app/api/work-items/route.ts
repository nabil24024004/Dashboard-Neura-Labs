import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";

function normalizeText(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const t = value.trim();
    return t.length > 0 ? t : null;
}

function normalizeNumber(value: unknown): number | null {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function normalizeDate(value: unknown): string | null {
    if (typeof value !== "string" || value.trim().length === 0) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().split("T")[0];
}

const WORK_ITEM_COLUMNS =
    "id,project_id,title,description,category,status,estimated_hours,actual_hours,due_date,sort_order,created_by,created_at,updated_at";

// GET: list work items for a project (or all for a user via RPC)
export async function GET(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const myItems = searchParams.get("my_items") === "true";

    const supabase = createAdminClient();

    // Fetch user's own work items across all projects
    if (myItems) {
        const { data, error } = await supabase.rpc("get_my_work_items", { p_user_id: userId });
        if (error) {
            console.error("Failed to fetch my work items:", error.message);
            return NextResponse.json({ error: "Failed to fetch work items" }, { status: 500 });
        }
        return NextResponse.json({ work_items: data ?? [] });
    }

    // Fetch work items for a specific project
    if (!projectId) {
        return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }

    const { data: items, error: itemsError } = await supabase
        .from("project_work_items")
        .select(WORK_ITEM_COLUMNS)
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

    if (itemsError) {
        console.error("Failed to fetch work items:", itemsError.message);
        return NextResponse.json({ error: "Failed to fetch work items" }, { status: 500 });
    }

    // Also fetch assignments for these items
    const itemIds = (items ?? []).map((i: { id: string }) => i.id);
    let assignments: Record<string, unknown>[] = [];
    if (itemIds.length > 0) {
        const { data: assignData } = await supabase
            .from("work_item_assignments")
            .select("id,work_item_id,member_id,role_on_item,assigned_at,users:member_id(id,first_name,last_name,email)")
            .in("work_item_id", itemIds);
        assignments = assignData ?? [];
    }

    // Group assignments by work_item_id
    const assignmentMap: Record<string, unknown[]> = {};
    for (const a of assignments) {
        const wiId = (a as { work_item_id: string }).work_item_id;
        if (!assignmentMap[wiId]) assignmentMap[wiId] = [];
        assignmentMap[wiId].push(a);
    }

    const enrichedItems = (items ?? []).map((item: Record<string, unknown>) => ({
        ...item,
        assignments: assignmentMap[(item as { id: string }).id] ?? [],
    }));

    // Also fetch category progress
    const { data: categoryProgress } = await supabase.rpc("get_category_progress", { p_project_id: projectId });

    return NextResponse.json({
        work_items: enrichedItems,
        category_progress: categoryProgress ?? [],
    });
}

// POST: create a work item (with assignments)
export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const projectId = normalizeText(body?.project_id);
    const title = normalizeText(body?.title);

    if (!projectId) return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const supabase = createAdminClient();

    const payload: Record<string, unknown> = {
        project_id: projectId,
        title,
        status: "not_started",
        created_by: userId,
    };

    const description = normalizeText(body?.description);
    if (description) payload.description = description;
    const category = normalizeText(body?.category);
    if (category) payload.category = category;
    const estimatedHours = normalizeNumber(body?.estimated_hours);
    if (estimatedHours !== null) payload.estimated_hours = estimatedHours;
    const dueDate = normalizeDate(body?.due_date);
    if (dueDate) payload.due_date = dueDate;
    const sortOrder = normalizeNumber(body?.sort_order);
    if (sortOrder !== null) payload.sort_order = sortOrder;

    const { data: item, error: itemError } = await supabase
        .from("project_work_items")
        .insert(payload)
        .select(WORK_ITEM_COLUMNS)
        .single();

    if (itemError) {
        console.error("Failed to create work item:", itemError.message);
        return NextResponse.json({ error: `Failed to create work item: ${itemError.message}` }, { status: 500 });
    }

    // Create assignments if provided
    const assignments = Array.isArray(body?.assignments) ? body.assignments : [];
    if (assignments.length > 0) {
        const assignPayloads = assignments.map((a: { member_id: string; role_on_item?: string }) => ({
            work_item_id: item.id,
            member_id: a.member_id,
            role_on_item: a.role_on_item || "assignee",
            assigned_by: userId,
        }));

        const { error: assignError } = await supabase
            .from("work_item_assignments")
            .insert(assignPayloads);

        if (assignError) {
            console.error("Failed to create assignments:", assignError.message);
        } else {
            // Phase 6.9: Log assignment notifications for each assignee
            for (const a of assignPayloads) {
                await logActivity({
                    userId,
                    action: `Assigned ${a.role_on_item}`,
                    entityType: "work_item",
                    entityId: item.id,
                    details: { target_name: item.title, assigned_member: a.member_id },
                });
            }
        }
    }

    await logActivity({
        userId,
        action: "Created",
        entityType: "work_item",
        entityId: item.id,
        details: { target_name: item.title },
    });

    return NextResponse.json({ work_item: item }, { status: 201 });
}

// PATCH: update a work item
export async function PATCH(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const id = normalizeText(body?.id);
    if (!id) return NextResponse.json({ error: "Work item id is required" }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (body?.title !== undefined) updates.title = normalizeText(body.title);
    if (body?.description !== undefined) updates.description = normalizeText(body.description);
    if (body?.category !== undefined) updates.category = normalizeText(body.category);
    if (body?.estimated_hours !== undefined) updates.estimated_hours = normalizeNumber(body.estimated_hours);
    if (body?.actual_hours !== undefined) updates.actual_hours = normalizeNumber(body.actual_hours);
    if (body?.due_date !== undefined) updates.due_date = normalizeDate(body.due_date);
    if (body?.sort_order !== undefined) updates.sort_order = normalizeNumber(body.sort_order);

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "No fields provided" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("project_work_items")
        .update(updates)
        .eq("id", id)
        .select(WORK_ITEM_COLUMNS)
        .single();

    if (error) {
        console.error("Failed to update work item:", error.message);
        return NextResponse.json({ error: "Failed to update work item" }, { status: 500 });
    }

    return NextResponse.json({ work_item: data });
}

// DELETE: remove a work item
export async function DELETE(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const id = normalizeText(body?.id);
    if (!id) return NextResponse.json({ error: "Work item id is required" }, { status: 400 });

    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("project_work_items")
        .delete()
        .eq("id", id)
        .select("id,title,project_id")
        .single();

    if (error) {
        console.error("Failed to delete work item:", error.message);
        return NextResponse.json({ error: "Failed to delete work item" }, { status: 500 });
    }

    await logActivity({
        userId,
        action: "Deleted",
        entityType: "work_item",
        entityId: data.id,
        details: { target_name: data.title },
    });

    return NextResponse.json({ success: true });
}
