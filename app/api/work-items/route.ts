import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
    queryDocs, getDoc, insertDoc, updateDoc, deleteDoc,
    deleteDocs, insertDocs, serializeDoc
} from "@/lib/firebase/db";
import { getMyWorkItems, getCategoryProgress } from "@/lib/firebase/queries";
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

// GET: list work items for a project (or all for a user)
export async function GET(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const myItems = searchParams.get("my_items") === "true";

    try {
        // Fetch user's own work items across all projects
        if (myItems) {
            const data = await getMyWorkItems(userId);
            return NextResponse.json({ work_items: data.map(serializeDoc) });
        }

        if (!projectId)
            return NextResponse.json({ error: "project_id is required" }, { status: 400 });

        // Fetch work items for a specific project
        const items = await queryDocs(
            "work_items",
            [{ field: "project_id", op: "==", value: projectId }],
            [{ field: "sort_order", direction: "asc" }]
        );

        // Fetch assignments for these items
        const itemIds = items.map((i) => i.id);
        let assignments: Record<string, unknown>[] = [];

        if (itemIds.length > 0) {
            // Firestore `in` supports up to 30 items
            const chunks: string[][] = [];
            for (let i = 0; i < itemIds.length; i += 30) {
                chunks.push(itemIds.slice(i, i + 30));
            }

            for (const chunk of chunks) {
                const chunkAssignments = await queryDocs(
                    "work_item_assignments",
                    [{ field: "work_item_id", op: "in", value: chunk }]
                );

                // Enrich with user data
                for (const a of chunkAssignments) {
                    if (a.member_id) {
                        const user = await getDoc("users", a.member_id as string);
                        if (user) {
                            (a as Record<string, unknown>).users = {
                                id: user.id,
                                first_name: user.first_name,
                                last_name: user.last_name,
                                email: user.email,
                            };
                        }
                    }
                }
                assignments = assignments.concat(chunkAssignments);
            }
        }

        // Group assignments by work_item_id
        const assignmentMap: Record<string, unknown[]> = {};
        for (const a of assignments) {
            const wiId = a.work_item_id as string;
            if (!assignmentMap[wiId]) assignmentMap[wiId] = [];
            assignmentMap[wiId].push(a);
        }

        const enrichedItems = items.map((item) => ({
            ...serializeDoc(item),
            assignments: (assignmentMap[item.id] ?? []).map((assignment) =>
                serializeDoc(assignment as Record<string, unknown>)
            ),
        }));

        // Also fetch category progress
        const categoryProgress = await getCategoryProgress(projectId);

        return NextResponse.json({
            work_items: enrichedItems,
            category_progress: categoryProgress,
        });
    } catch (error) {
        console.error("Failed to fetch work items:", error);
        return NextResponse.json({ error: "Failed to fetch work items" }, { status: 500 });
    }
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

    try {
        const item = await insertDoc("work_items", payload);

        // Create assignments if provided
        const assignments = Array.isArray(body?.assignments) ? body.assignments : [];
        if (assignments.length > 0) {
            const assignPayloads = assignments.map((a: { member_id: string; role_on_item?: string }) => ({
                work_item_id: item.id,
                member_id: a.member_id,
                role_on_item: a.role_on_item || "assignee",
                assigned_by: userId,
                assigned_at: new Date().toISOString(),
            }));

            await insertDocs("work_item_assignments", assignPayloads);

            for (const a of assignPayloads) {
                await logActivity({
                    userId,
                    action: `Assigned ${a.role_on_item}`,
                    entityType: "work_item",
                    entityId: item.id,
                    details: { target_name: item.title as string, assigned_member: a.member_id },
                });
            }
        }

        await logActivity({
            userId,
            action: "Created",
            entityType: "work_item",
            entityId: item.id,
            details: { target_name: item.title as string },
        });

        return NextResponse.json({ work_item: serializeDoc(item) }, { status: 201 });
    } catch (error) {
        console.error("Failed to create work item:", error);
        return NextResponse.json({ error: "Failed to create work item" }, { status: 500 });
    }
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

    if (Object.keys(updates).length === 0)
        return NextResponse.json({ error: "No fields provided" }, { status: 400 });

    try {
        const data = await updateDoc("work_items", id, updates);
        if (!data) return NextResponse.json({ error: "Work item not found" }, { status: 404 });
        return NextResponse.json({ work_item: serializeDoc(data) });
    } catch (error) {
        console.error("Failed to update work item:", error);
        return NextResponse.json({ error: "Failed to update work item" }, { status: 500 });
    }
}

// DELETE: remove a work item
export async function DELETE(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const id = normalizeText(body?.id);
    if (!id) return NextResponse.json({ error: "Work item id is required" }, { status: 400 });

    try {
        const item = await getDoc("work_items", id);
        if (!item) return NextResponse.json({ error: "Work item not found" }, { status: 404 });

        // Clean up related data
        await deleteDocs("work_item_assignments", [{ field: "work_item_id", op: "==", value: id }]);
        await deleteDocs("work_item_status_log", [{ field: "work_item_id", op: "==", value: id }]);

        await deleteDoc("work_items", id);

        // Recompute project progress
        if (item.project_id) {
            const { computeProjectProgress } = await import("@/lib/firebase/queries");
            await computeProjectProgress(item.project_id as string);
        }

        await logActivity({
            userId,
            action: "Deleted",
            entityType: "work_item",
            entityId: id,
            details: { target_name: item.title as string },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete work item:", error);
        return NextResponse.json({ error: "Failed to delete work item" }, { status: 500 });
    }
}
