import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MyWorkClient } from "@/components/dashboard/my-work/my-work-client";

export const dynamic = "force-dynamic";

export default async function MyWorkPage() {
    const { userId } = await auth();
    if (!userId) redirect("/login");

    const db = createAdminClient();

    // Fetch work items for current user via RPC
    const { data: workItems } = await db.rpc("get_my_work_items", { p_user_id: userId });

    // Fetch user's tasks
    const { data: tasks } = await db
        .from("tasks")
        .select("id,title,status,priority,deadline,project_id")
        .eq("assigned_to", userId)
        .neq("status", "Done")
        .order("created_at", { ascending: false });

    return (
        <MyWorkClient
            workItems={(workItems as Record<string, unknown>[]) ?? []}
            tasks={(tasks as Record<string, unknown>[]) ?? []}
        />
    );
}
