import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDoc, updateDoc, insertDoc, serializeDoc } from "@/lib/firebase/db";
import { computeProjectProgress } from "@/lib/firebase/queries";
import { logActivity } from "@/lib/activity-log";

function normalizeText(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const t = value.trim();
    return t.length > 0 ? t : null;
}

const VALID_STATUSES = new Set(["not_started", "in_progress", "in_review", "done", "blocked"]);

// PATCH — update the status of a work item and log it
export async function PATCH(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const id = normalizeText(body?.id);
    const newStatus = normalizeText(body?.status);

    if (!id) return NextResponse.json({ error: "Work item id is required" }, { status: 400 });
    if (!newStatus || !VALID_STATUSES.has(newStatus))
        return NextResponse.json({ error: `Invalid status. Must be one of: ${[...VALID_STATUSES].join(", ")}` }, { status: 400 });

    try {
        const existing = await getDoc("work_items", id);
        if (!existing)
            return NextResponse.json({ error: "Work item not found" }, { status: 404 });

        const previousStatus = (existing.status as string) || "not_started";

        // Update work item status
        const data = await updateDoc("work_items", id, { status: newStatus });

        // Log the status change
        await insertDoc("work_item_status_log", {
            work_item_id: id,
            previous_status: previousStatus,
            new_status: newStatus,
            changed_by: userId,
            changed_at: new Date().toISOString(),
        });

        // Recompute project progress (replaces Postgres trigger)
        if (existing.project_id) {
            await computeProjectProgress(existing.project_id as string);
        }

        await logActivity({
            userId,
            action: "Updated status",
            entityType: "work_item",
            entityId: id,
            details: {
                target_name: existing.title as string,
                from: previousStatus,
                to: newStatus,
            },
        });

        return NextResponse.json({ work_item: serializeDoc(data!) });
    } catch (error) {
        console.error("Failed to update work item status:", error);
        return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }
}
