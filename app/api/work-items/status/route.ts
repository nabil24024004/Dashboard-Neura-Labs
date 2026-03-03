import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";

const VALID_TRANSITIONS: Record<string, string[]> = {
    not_started: ["in_progress"],
    in_progress: ["in_review"],
    in_review: ["done", "in_progress"],
    done: ["in_progress"],
};

export async function PATCH(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const workItemId = body?.work_item_id;
    const newStatus = body?.status;
    const note = typeof body?.note === "string" ? body.note.trim() : null;

    if (!workItemId || !newStatus) {
        return NextResponse.json({ error: "work_item_id and status are required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get current work item
    const { data: item, error: fetchError } = await supabase
        .from("project_work_items")
        .select("id,title,status,project_id")
        .eq("id", workItemId)
        .single();

    if (fetchError || !item) {
        return NextResponse.json({ error: "Work item not found" }, { status: 404 });
    }

    const currentStatus = item.status;

    // Validate transition
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
        return NextResponse.json(
            { error: `Invalid transition: ${currentStatus} → ${newStatus}` },
            { status: 400 }
        );
    }

    // Update status
    const { data: updated, error: updateError } = await supabase
        .from("project_work_items")
        .update({ status: newStatus })
        .eq("id", workItemId)
        .select("id,title,status,project_id")
        .single();

    if (updateError) {
        console.error("Failed to update work item status:", updateError.message);
        return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }

    // Log the status change
    await supabase.from("work_item_status_log").insert({
        work_item_id: workItemId,
        changed_by: userId,
        from_status: currentStatus,
        to_status: newStatus,
        note: note || null,
    });

    await logActivity({
        userId,
        action: `Status changed to ${newStatus}`,
        entityType: "work_item",
        entityId: updated.id,
        details: { target_name: updated.title, from_status: currentStatus, to_status: newStatus },
    });

    // Fetch updated project progress
    const { data: project } = await supabase
        .from("projects")
        .select("id,progress")
        .eq("id", updated.project_id)
        .single();

    return NextResponse.json({
        work_item: updated,
        project_progress: project?.progress ?? null,
    });
}
