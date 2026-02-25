import { createClient } from "@/lib/supabase/server";
import { ActivityTimeline, ActivityLog } from "@/components/dashboard/activity/activity-timeline";
import { Clock } from "lucide-react";

export default async function ActivityPage() {
  const supabase = await createClient();

  const { data: dbActivities, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const activities = (error ? [] : (dbActivities ?? [])) as ActivityLog[];

  return (
    <div className="flex flex-col gap-6 h-full max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#F5F5F5]">Activity Log</h2>
          <p className="text-sm text-[#737373]">A chronological history of actions taken within your workspace.</p>
        </div>
      </div>

      <div className="bg-[#111111] border border-[#262626] rounded-xl p-6">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Clock className="h-10 w-10 text-[#262626]" />
            <p className="text-sm text-[#737373]">No activity recorded yet.</p>
            <p className="text-xs text-[#404040]">Actions you take across the workspace will appear here.</p>
          </div>
        ) : (
          <ActivityTimeline activities={activities} />
        )}
      </div>
    </div>
  );
}
