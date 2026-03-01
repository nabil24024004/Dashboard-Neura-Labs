import { createAdminClient } from "@/lib/supabase/admin";
import { ActivityTimeline, ActivityLog } from "@/components/dashboard/activity/activity-timeline";
import { Clock } from "lucide-react";

export default async function ActivityPage() {
  const supabase = createAdminClient();

  const { data: dbActivities, error } = await supabase
    .from("activity_logs")
    .select("id, actor_id, action, entity_type, entity_id, timestamp")
    .order("timestamp", { ascending: false })
    .limit(50);

  const activities = (error ? [] : (dbActivities ?? [])) as ActivityLog[];

  return (
    <div className="flex flex-col gap-6 h-full max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Activity Log</h2>
          <p className="text-sm text-muted-foreground">A chronological history of actions taken within your workspace.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Clock className="h-10 w-10 text-[#262626]" />
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            <p className="text-xs text-muted-foreground">Actions you take across the workspace will appear here.</p>
          </div>
        ) : (
          <ActivityTimeline activities={activities} />
        )}
      </div>
    </div>
  );
}
