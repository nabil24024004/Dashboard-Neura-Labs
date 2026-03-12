import { getDoc, queryDocs, serializeDoc } from "@/lib/firebase/db";
import { getCategoryProgress } from "@/lib/firebase/queries";
import { notFound } from "next/navigation";
import { ProjectDetailClient } from "@/components/dashboard/projects/project-detail-client";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
    const { id } = await params;

    const project = await getDoc("projects", id);
    if (!project) return notFound();

    // Enrich with client name
    if (project.client_id) {
        const client = await getDoc("clients", project.client_id as string);
        if (client) (project as Record<string, unknown>).clients = { company_name: client.company_name };
    }

    // Fetch work items (Sort locally to avoid composite index error)
    const workItems = await queryDocs(
        "work_items",
        [{ field: "project_id", op: "==", value: id }]
    );
    workItems.sort((a, b) => (a.sort_order as number) - (b.sort_order as number));

    // Fetch assignments for all work items
    const itemIds = workItems.map((i) => i.id);
    let assignments: Record<string, unknown>[] = [];

    if (itemIds.length > 0) {
        // Firestore `in` supports up to 30
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

    // Group assignments per work item
    const assignmentMap: Record<string, unknown[]> = {};
    for (const a of assignments) {
        const wiId = (a as { work_item_id: string }).work_item_id;
        if (!assignmentMap[wiId]) assignmentMap[wiId] = [];
        assignmentMap[wiId].push(serializeDoc(a as Record<string, unknown>));
    }

    const enrichedItems = workItems.map((item) => ({
        ...serializeDoc(item),
        assignments: assignmentMap[item.id] ?? [],
    }));

    // Category progress
    const categoryProgress = await getCategoryProgress(id);

    // Team members for assignment
    const members = await queryDocs("users", [], [{ field: "first_name", direction: "asc" }]);
    const safeMembers = members.map((m) => ({
        id: m.id,
        first_name: m.first_name,
        last_name: m.last_name,
        email: m.email,
    }));

    return (
        <ProjectDetailClient
            project={serializeDoc(project) as Parameters<typeof ProjectDetailClient>[0]["project"]}
            workItems={enrichedItems as Parameters<typeof ProjectDetailClient>[0]["workItems"]}
            categoryProgress={
                (categoryProgress ?? []) as Parameters<typeof ProjectDetailClient>[0]["categoryProgress"]
            }
            teamMembers={safeMembers as Parameters<typeof ProjectDetailClient>[0]["teamMembers"]}
        />
    );
}
