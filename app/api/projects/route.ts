import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
    queryDocs, getDoc, insertDoc, updateDoc,
    deleteDoc, deleteDocs, serializeDoc, countDocs,
} from "@/lib/firebase/db";
import { logActivity } from "@/lib/activity-log";

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
    return d.toISOString().split("T")[0];
}

async function enrichWithClientName(doc: Record<string, unknown>) {
    if (doc.client_id && !doc.client_name) {
        const client = await getDoc("clients", doc.client_id as string);
        if (client) doc.client_name = client.company_name;
    }
    // Provide nested shape for backwards-compat with frontend
    return {
        ...doc,
        clients: doc.client_name ? { company_name: doc.client_name } : null,
    };
}

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const data = await queryDocs(
            "projects",
            [],
            [{ field: "created_at", direction: "desc" }]
        );

        const enriched = await Promise.all(data.map((d) => enrichWithClientName(serializeDoc(d))));
        return NextResponse.json({ projects: enriched });
    } catch (error) {
        console.error("Failed to fetch projects:", error);
        return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
    }
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

    // Denormalize client name
    let client_name: string | null = null;
    const client = await getDoc("clients", client_id);
    if (client) client_name = client.company_name as string;

    const payload: Record<string, unknown> = {
        project_name,
        client_id,
        client_name,
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

    try {
        const data = await insertDoc("projects", payload);

        // Create work items + assignments if provided (from wizard Step 2)
        const workItems = Array.isArray(body?.work_items) ? body.work_items : [];
        if (workItems.length > 0) {
            for (let i = 0; i < workItems.length; i++) {
                const wi = workItems[i];
                const wiPayload: Record<string, unknown> = {
                    project_id: data.id,
                    title: wi.title,
                    category: wi.category || "General",
                    description: wi.description || null,
                    estimated_hours: wi.estimated_hours ?? null,
                    due_date: wi.due_date ? normalizeDate(wi.due_date) : null,
                    sort_order: wi.sort_order ?? i,
                    status: "not_started",
                    created_by: userId,
                };

                const createdWi = await insertDoc("work_items", wiPayload);

                // Create assignments for this work item
                const assignments = Array.isArray(wi.assignments) ? wi.assignments : [];
                if (assignments.length > 0 && createdWi) {
                    for (const a of assignments) {
                        await insertDoc("work_item_assignments", {
                            work_item_id: createdWi.id,
                            member_id: a.member_id,
                            role_on_item: a.role_on_item || "assignee",
                            assigned_by: userId,
                            assigned_at: new Date().toISOString(),
                        });
                    }
                }
            }

            // Mark as having work breakdown imported if JSON was used
            if (body?.work_breakdown_imported) {
                await updateDoc("projects", data.id, { work_breakdown_imported: true });
            }

            // Recompute progress
            const { computeProjectProgress } = await import("@/lib/firebase/queries");
            await computeProjectProgress(data.id);

            // Refetch project
            const updated = await getDoc("projects", data.id);
            if (updated) {
                await logActivity({
                    userId,
                    action: "Created",
                    entityType: "project",
                    entityId: updated.id,
                    details: { target_name: updated.project_name as string, work_items_count: workItems.length },
                });
                const enriched = await enrichWithClientName(serializeDoc(updated));
                return NextResponse.json({ project: enriched }, { status: 201 });
            }
        }

        await logActivity({
            userId,
            action: "Created",
            entityType: "project",
            entityId: data.id,
            details: { target_name: data.project_name as string },
        });

        const enriched = await enrichWithClientName(serializeDoc(data));
        return NextResponse.json({ project: enriched }, { status: 201 });
    } catch (error) {
        console.error("Failed to create project:", error);
        return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
    }
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

    if (Object.keys(updates).length === 0)
        return NextResponse.json({ error: "No fields provided" }, { status: 400 });

    try {
        const data = await updateDoc("projects", id, updates);
        if (!data) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        await logActivity({
            userId,
            action: "Updated",
            entityType: "project",
            entityId: data.id,
            details: { target_name: data.project_name as string, status: data.status as string },
        });

        const enriched = await enrichWithClientName(serializeDoc(data));
        return NextResponse.json({ project: enriched });
    } catch (error) {
        console.error("Failed to update project:", error);
        return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const id = normalizeText(body?.id);
    if (!id) return NextResponse.json({ error: "Project id is required" }, { status: 400 });

    try {
        const proj = await getDoc("projects", id);
        if (!proj) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        // Get all work item IDs for this project
        const workItems = await queryDocs("work_items", [{ field: "project_id", op: "==", value: id }]);
        const wiIds = workItems.map((wi) => wi.id);

        if (wiIds.length > 0) {
            // Delete status logs and assignments for these work items
            for (const wiId of wiIds) {
                await deleteDocs("work_item_status_log", [{ field: "work_item_id", op: "==", value: wiId }]);
                await deleteDocs("work_item_assignments", [{ field: "work_item_id", op: "==", value: wiId }]);
            }
            // Delete the work items
            await deleteDocs("work_items", [{ field: "project_id", op: "==", value: id }]);
        }

        // Delete tasks linked to this project
        await deleteDocs("tasks", [{ field: "project_id", op: "==", value: id }]);

        // Delete the project
        await deleteDoc("projects", id);

        await logActivity({
            userId,
            action: "Deleted",
            entityType: "project",
            entityId: proj.id,
            details: { target_name: proj.project_name as string },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete project:", error);
        return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
    }
}
