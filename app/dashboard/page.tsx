import { format } from "date-fns";
import { currentUser } from "@clerk/nextjs/server";
import { 
  Users, 
  FolderKanban, 
  FileText, 
  DollarSign,
  ArrowUpRight,
  Clock
} from "lucide-react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ActivityTimeline, ActivityLog } from "@/components/dashboard/activity/activity-timeline";
import { AutoRefresh } from "@/components/dashboard/overview/auto-refresh";

interface DashboardTask {
  id: string;
  title: string;
  priority: "Urgent" | "High" | "Medium" | "Low" | null;
  project_id: string | null;
  deadline: string | null;
  status: "To Do" | "In Progress" | "In Review" | "Done";
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  platform: string;
  meeting_link: string | null;
  client?: { company: string }[] | { company: string } | null;
}

export default async function DashboardOverview() {
  const user = await currentUser();
  const today = format(new Date(), "EEE, MMM d yyyy");
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const adminDb = createAdminClient();
  const supabase = await createClient();

  // Fetch all overview data in parallel
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const todayStr = format(now, "yyyy-MM-dd");

  const [
    clientsResult,
    projectsResult,
    pendingInvoicesResult,
    revenueResult,
    meetingsResult,
    activitiesResult,
    tasksResult
  ] = await Promise.all([
    // Active clients count
    adminDb
      .from("clients")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    // Running projects count
    adminDb
      .from("projects")
      .select("id", { count: "exact", head: true })
      .neq("status", "Completed"),
    // Pending invoices total
    adminDb
      .from("invoices")
      .select("total_amount")
      .in("status", ["Pending", "Sent", "Overdue"]),
    // Revenue this month (from payments)
    adminDb
      .from("payments")
      .select("amount")
      .gte("created_at", startOfMonth),
    // Today's meetings
    adminDb
      .from("meetings")
      .select("id, title, date, time, platform, meeting_link, client:clients(company)")
      .eq("date", todayStr)
      .order("time", { ascending: true })
      .limit(5),
    // Recent activity
    supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
    // Tasks due today
    user?.id
      ? supabase
          .from("tasks")
          .select("id,title,priority,project_id,deadline,status")
          .neq("status", "Done")
          .eq("deadline", todayStr)
          .order("deadline", { ascending: true })
          .limit(6)
      : Promise.resolve({ data: [], error: null })
  ]);

  const activeClients = clientsResult.count ?? 0;
  const runningProjects = projectsResult.count ?? 0;
  const pendingInvoiceTotal = (pendingInvoicesResult.data ?? []).reduce(
    (sum: number, inv: { total_amount: number | null }) => sum + (inv.total_amount ?? 0), 0
  );
  const revenueThisMonth = (revenueResult.data ?? []).reduce(
    (sum: number, pay: { amount: number | null }) => sum + (pay.amount ?? 0), 0
  );
  const meetings = (meetingsResult.data ?? []) as Meeting[];
  const activities = (activitiesResult.data ?? []) as ActivityLog[];
  const dueTodayTasks = (tasksResult.data ?? []) as DashboardTask[];

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const statCards = [
    { label: "Active Clients", value: activeClients.toString(), icon: Users, href: "/dashboard/clients", color: "" },
    { label: "Running Projects", value: runningProjects.toString(), icon: FolderKanban, href: "/dashboard/projects", color: "" },
    { label: "Pending Invoices", value: formatCurrency(pendingInvoiceTotal), icon: FileText, href: "/dashboard/invoices", color: "" },
    { label: "Revenue This Month", value: formatCurrency(revenueThisMonth), icon: DollarSign, href: "/dashboard/payments", color: "text-[#22c55e]" },
  ];

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      <AutoRefresh />
      <div className="flex items-center justify-between">
         <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}, {user?.firstName}
         </h1>
         <p className="text-sm text-[#737373]">{today}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group p-4 rounded-xl border border-[#262626] bg-[#111111] flex flex-col justify-between h-32 hover:border-[#404040] transition-colors"
          >
            <div className="flex items-center justify-between text-[#737373]">
              <div className="flex items-center gap-2">
                <card.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{card.label}</span>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className={`text-3xl font-semibold ${card.color}`}>{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="rounded-xl border border-[#262626] bg-[#111111] overflow-hidden flex flex-col h-[300px]">
            <div className="p-4 border-b border-[#262626] flex items-center justify-between">
               <h3 className="font-medium text-[#F5F5F5]">Upcoming Meetings (Today)</h3>
               <Link href="/dashboard/meetings" className="text-xs text-[#6366f1] hover:text-[#818cf8]">View all</Link>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
               {meetings.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                   <Clock className="h-8 w-8 text-[#262626]" />
                   <p className="text-sm text-[#737373]">No meetings scheduled for today.</p>
                   <Link href="/dashboard/meetings" className="text-xs text-[#6366f1] hover:text-[#818cf8]">Schedule a meeting</Link>
                 </div>
               ) : (
                 meetings.map((meeting) => (
                   <div key={meeting.id} className="flex items-start gap-3 p-3 rounded-lg border border-[#262626] bg-[#0A0A0A] hover:border-[#404040] transition-colors">
                     <div className="flex flex-col flex-1">
                       <p className="text-sm font-medium text-[#F5F5F5]">{meeting.title}</p>
                       <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#737373]">
                         <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#14b8a6]"></span>
                            {meeting.time || "TBD"}
                         </span>
                         {meeting.platform && (
                           <>
                             <span>·</span>
                             <span>{meeting.platform}</span>
                           </>
                         )}
                         {meeting.client && (
                           <>
                             <span>·</span>
                             <span>{Array.isArray(meeting.client) ? meeting.client[0]?.company : meeting.client.company}</span>
                           </>
                         )}
                       </div>
                     </div>
                     {meeting.meeting_link && (
                       <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#6366f1] hover:text-[#818cf8] px-3 py-1.5 rounded-md bg-[#6366f1]/10">
                         Join
                       </a>
                     )}
                   </div>
                 ))
               )}
            </div>
         </div>

         <div className="rounded-xl border border-[#262626] bg-[#111111] overflow-hidden flex flex-col h-[300px]">
            <div className="p-4 border-b border-[#262626] flex items-center justify-between">
               <h3 className="font-medium text-[#F5F5F5]">Tasks Due Today</h3>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {dueTodayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                  <p className="text-sm text-[#737373]">No tasks due today.</p>
                </div>
              ) : (
                dueTodayTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-[#262626] bg-[#0A0A0A] hover:border-[#404040] transition-colors">
                    <div className="mt-0.5 border-2 border-[#404040] rounded-sm w-4 h-4"></div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap pr-10">
                        <p className="text-sm font-medium leading-none text-[#F5F5F5]">{task.title}</p>
                        <span
                          className={`flex h-2 w-2 rounded-full ${
                            task.priority === "Urgent"
                              ? "bg-[#ef4444]"
                              : task.priority === "High"
                                ? "bg-[#f59e0b]"
                                : task.priority === "Medium"
                                  ? "bg-[#eab308]"
                                  : "bg-[#22c55e]"
                          }`}
                          title={`${task.priority ?? "Low"} Priority`}
                        ></span>
                      </div>
                      <p className="text-xs text-[#737373]">
                        {task.deadline ? format(new Date(task.deadline), "MMM d") : "No due date"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
         </div>
      </div>

       <div className="rounded-xl border border-[#262626] bg-[#111111] overflow-hidden">
          <div className="p-4 border-b border-[#262626] flex items-center justify-between">
             <h3 className="font-medium text-[#F5F5F5]">Recent Activity Feed</h3>
             <Link href="/dashboard/activity" className="text-xs text-[#6366f1] hover:text-[#818cf8]">View all activity</Link>
          </div>
          <div className="p-6">
             {activities.length === 0 ? (
               <p className="text-sm text-[#737373] text-center py-4">No recent activity.</p>
             ) : (
               <ActivityTimeline activities={activities} />
             )}
          </div>
       </div>
    </div>
  );
}
