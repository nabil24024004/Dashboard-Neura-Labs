import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ProjectDetailClient } from "@/components/dashboard/projects/project-detail-client";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
    const { id } = await params;
    const db = createAdminClient();

    const { data: project, error } = await db
        .from("projects")
        .select(
            "id,project_name,service_type,status,deadline,budget,progress,description,assigned_team,created_at,work_breakdown_imported,client_id,clients(company_name)"
        )
        .eq("id", id)
        .single();

    if (error || !project) return notFound();

    // Fetch work items with assignments
    const { data: workItems } = await db
        .from("project_work_items")
        .select("*")
        .eq("project_id", id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

    const itemIds = (workItems ?? []).map((i: { id: string }) => i.id);
    let assignments: Record<string, unknown>[] = [];
    if (itemIds.length > 0) {
        const { data } = await db
            .from("work_item_assignments")
            .select("id,work_item_id,member_id,role_on_item,assigned_at,users:member_id(id,first_name,last_name,email)")
            .in("work_item_id", itemIds);
        assignments = data ?? [];
    }

    // Group assignments per work item
    const assignmentMap: Record<string, unknown[]> = {};
    for (const a of assignments) {
        const wiId = (a as { work_item_id: string }).work_item_id;
        if (!assignmentMap[wiId]) assignmentMap[wiId] = [];
        assignmentMap[wiId].push(a);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrichedItems = (workItems ?? []).map((item: any) => ({
        ...item,
        assignments: assignmentMap[item.id] ?? [],
    }));

    // Category progress
    const { data: categoryProgress } = await db.rpc("get_category_progress", { p_project_id: id });

    // Team members for assignment
    const { data: members } = await db
        .from("users")
        .select("id,first_name,last_name,email")
        .order("first_name", { ascending: true });

    return (
        <ProjectDetailClient
            project={project as any}
            workItems={enrichedItems as any}
            categoryProgress={(categoryProgress as any) ?? []}
            teamMembers={(members as any) ?? []}
        />
    );
}
