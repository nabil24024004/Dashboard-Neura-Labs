import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { queryDocs, serializeDoc } from "@/lib/firebase/db";
import { getMyWorkItems } from "@/lib/firebase/queries";
import { MyWorkClient } from "@/components/dashboard/my-work/my-work-client";

export const dynamic = "force-dynamic";

export default async function MyWorkPage() {
    const { userId } = await auth();
    if (!userId) redirect("/login");

    // Fetch work items for current user via query helper
    const workItems = await getMyWorkItems(userId);

    // Fetch user's tasks
    const tasks = await queryDocs(
        "tasks",
        [{ field: "assigned_to", op: "==", value: userId }]
    );

    const activeTasks = tasks
        .filter((t) => t.status !== "Done")
        .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())
        .map(serializeDoc);

    return (
        <MyWorkClient
            workItems={workItems.map(serializeDoc) as Record<string, unknown>[]}
            tasks={activeTasks as Record<string, unknown>[]}
        />
    );
}
