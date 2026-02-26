import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  CreditCard,
  UserPlus,
  Rocket,
  CheckCircle2,
  FileSignature,
  ClipboardList,
  Plug,
  Settings,
  MessageSquare,
  type LucideIcon
} from "lucide-react";

export type ActivityLog = {
  id: string;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details?: Record<string, unknown> | null;
  created_at?: string | null;
  timestamp?: string | null;
};

// Map entity types and actions to visual styles
const getActivityConfig = (entityType: string, action: string): { icon: LucideIcon, colorClass: string, bgClass: string } => {
  const type = entityType.toLowerCase();
  const act = action.toLowerCase();

  if (type === "invoice") {
    return { icon: FileText, colorClass: "text-[#3b82f6]", bgClass: "bg-[#3b82f6]/10 border-[#3b82f6]/20" };
  }
  if (type === "payment") {
    return { icon: CreditCard, colorClass: "text-[#22c55e]", bgClass: "bg-[#22c55e]/10 border-[#22c55e]/20" };
  }
  if (type === "project") {
    if (act.includes("complete")) return { icon: CheckCircle2, colorClass: "text-[#22c55e]", bgClass: "bg-[#22c55e]/10 border-[#22c55e]/20" };
    return { icon: Rocket, colorClass: "text-[#a855f7]", bgClass: "bg-[#a855f7]/10 border-[#a855f7]/20" };
  }
  if (type === "client") {
    return { icon: UserPlus, colorClass: "text-[#f59e0b]", bgClass: "bg-[#f59e0b]/10 border-[#f59e0b]/20" };
  }
  if (type === "agreement") {
    return { icon: FileSignature, colorClass: "text-[#ec4899]", bgClass: "bg-[#ec4899]/10 border-[#ec4899]/20" };
  }
  if (type === "contract") {
    return { icon: FileSignature, colorClass: "text-[#8b5cf6]", bgClass: "bg-[#8b5cf6]/10 border-[#8b5cf6]/20" };
  }
  if (type === "meeting") {
    return { icon: MessageSquare, colorClass: "text-[#14b8a6]", bgClass: "bg-[#14b8a6]/10 border-[#14b8a6]/20" };
  }
  if (type === "task") {
    return { icon: ClipboardList, colorClass: "text-[#f59e0b]", bgClass: "bg-[#f59e0b]/10 border-[#f59e0b]/20" };
  }
  if (type === "integration") {
    return { icon: Plug, colorClass: "text-[#6366f1]", bgClass: "bg-[#6366f1]/10 border-[#6366f1]/20" };
  }
  if (type === "file") {
    return { icon: FileText, colorClass: "text-[#0ea5e9]", bgClass: "bg-[#0ea5e9]/10 border-[#0ea5e9]/20" };
  }

  return { icon: Settings, colorClass: "text-[#737373]", bgClass: "bg-[#262626] border-[#404040]" };
};

export function ActivityTimeline({ activities }: { activities: ActivityLog[] }) {
  if (!activities?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[#737373]">
        <p>No recent activity found.</p>
      </div>
    );
  }

  return (
    <div className="relative border-l border-[#262626] ml-4 pb-4 space-y-8">
      {activities.map((activity) => {
        const { icon: Icon, colorClass, bgClass } = getActivityConfig(activity.entity_type, activity.action);
        const occurredAt = activity.created_at ?? activity.timestamp ?? null;
        const timeAgo = occurredAt
          ? formatDistanceToNow(new Date(occurredAt), { addSuffix: true })
          : "just now";
        const note = typeof activity.details?.note === "string" ? activity.details.note : null;
        const description = activity.action || `${activity.entity_type} updated`;

        return (
          <div key={activity.id} className="relative pl-8 sm:pl-10 group">
            <div className={`absolute -left-4 top-0.5 flex h-8 w-8 items-center justify-center rounded-full border ${bgClass} ring-4 ring-[#0A0A0A] transition-transform group-hover:scale-110`}>
              <Icon className={`h-4 w-4 ${colorClass}`} />
            </div>
            
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
               <div className="flex flex-col">
                  <p className="text-sm font-medium text-[#F5F5F5]">
                     {description}
                  </p>
                  {note && (
                    <p className="text-sm text-[#A3A3A3] mt-1">&quot;{note}&quot;</p>
                  )}
               </div>
               
               <time className="text-xs text-[#737373] mt-1 sm:mt-0 whitespace-nowrap">
                  {timeAgo}
               </time>
            </div>
          </div>
        );
      })}
    </div>
  );
}
