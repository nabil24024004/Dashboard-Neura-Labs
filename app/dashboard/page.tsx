import { format } from "date-fns";
import { currentUser } from "@clerk/nextjs/server";
import {
  Users,
  FolderKanban,
  FileText,
  DollarSign,
  ArrowUpRight,
  Clock,
  Briefcase,
  Play,
  Eye,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
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
  scheduled_at: string;
  platform: string;
  meeting_url: string | null;
  client?: { company_name: string }[] | { company_name: string } | null;
}

interface MyWorkItem {
  work_item_id: string;
  title: string;
  status: string;
  category: string;
  project_name: string;
  project_id: string;
  role_on_item: string;
  due_date: string | null;
}

export default async function DashboardOverview() {
  const user = await currentUser();
  const today = format(new Date(), "EEE, MMM d yyyy");
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const adminDb = createAdminClient();

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
    tasksResult,
    myWorkResult,
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
      .select("amount")
      .in("status", ["Pending", "Sent", "Overdue"]),
    // Revenue this month (from payments)
    adminDb
      .from("payments")
      .select("amount")
      .gte("created_at", startOfMonth),
    // Today's meetings
    adminDb
      .from("meetings")
      .select("id, title, scheduled_at, platform, meeting_url, client:clients(company_name)")
      .gte("scheduled_at", `${todayStr}T00:00:00`)
      .lt("scheduled_at", `${todayStr}T23:59:59`)
      .order("scheduled_at", { ascending: true })
      .limit(5),
    // Recent activity
    adminDb
      .from("activity_logs")
      .select("id, actor_id, action, entity_type, entity_id, timestamp")
      .order("timestamp", { ascending: false })
      .limit(5),
    // Tasks due today
    user?.id
      ? adminDb
        .from("tasks")
        .select("id,title,priority,project_id,deadline,status")
        .neq("status", "Done")
        .eq("deadline", todayStr)
        .order("deadline", { ascending: true })
        .limit(6)
      : Promise.resolve({ data: [], error: null }),
    // My work items (via RPC)
    user?.id
      ? adminDb.rpc("get_my_work_items", { p_user_id: user.id })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const activeClients = clientsResult.count ?? 0;
  const runningProjects = projectsResult.count ?? 0;
  const pendingInvoiceTotal = (pendingInvoicesResult.data ?? []).reduce(
    (sum: number, inv: { amount: number | null }) => sum + (inv.amount ?? 0), 0
  );
  const revenueThisMonth = (revenueResult.data ?? []).reduce(
    (sum: number, pay: { amount: number | null }) => sum + (pay.amount ?? 0), 0
  );
  const meetings = (meetingsResult.data ?? []) as Meeting[];
  const activities = (activitiesResult.data ?? []) as ActivityLog[];
  const dueTodayTasks = (tasksResult.data ?? []) as DashboardTask[];
  const myWorkItems = (myWorkResult.data ?? []) as MyWorkItem[];

  // Work item stats
  const wiTotal = myWorkItems.length;
  const wiInProgress = myWorkItems.filter(w => w.status === "in_progress").length;
  const wiInReview = myWorkItems.filter(w => w.status === "in_review").length;
  const wiDone = myWorkItems.filter(w => w.status === "done").length;
  const wiActive = myWorkItems.filter(w => w.status !== "done").slice(0, 5);

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
    <div className="flex flex-col gap-6 md:gap-8 max-w-7xl mx-auto">
      <AutoRefresh intervalMs={30_000} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}, {user?.firstName}
        </h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group p-4 rounded-xl border border-border bg-card flex flex-col justify-between h-32 hover:border-muted transition-colors"
          >
            <div className="flex items-center justify-between text-muted-foreground">
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

      {/* Phase 6.6: My Work Summary */}
      {wiTotal > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-foreground">My Work Summary</h3>
            </div>
            <Link href="/dashboard/my-work" className="text-xs text-[#6366f1] hover:text-primary">View all</Link>
          </div>
          <div className="p-4 space-y-4">
            {/* Mini stat row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg bg-background border border-border p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{wiTotal}</p>
              </div>
              <div className="rounded-lg bg-background border border-border p-3">
                <p className="text-xs text-muted-foreground">In Progress</p>
                <p className="text-lg font-bold text-[#3b82f6]">{wiInProgress}</p>
              </div>
              <div className="rounded-lg bg-background border border-border p-3">
                <p className="text-xs text-muted-foreground">In Review</p>
                <p className="text-lg font-bold text-[#a855f7]">{wiInReview}</p>
              </div>
              <div className="rounded-lg bg-background border border-border p-3">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-lg font-bold text-[#22c55e]">{wiDone}</p>
              </div>
            </div>

            {/* Active work items list */}
            {wiActive.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Items</h4>
                {wiActive.map((wi) => {
                  const statusColors: Record<string, string> = {
                    not_started: "bg-[#737373]",
                    in_progress: "bg-[#3b82f6]",
                    in_review: "bg-[#a855f7]",
                  };
                  const StatusIcon = wi.status === "in_progress" ? Play : wi.status === "in_review" ? Eye : CheckCircle2;
                  return (
                    <Link
                      key={wi.work_item_id}
                      href={`/dashboard/projects/${wi.project_id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:border-muted transition-colors"
                    >
                      <span className={`h-2 w-2 rounded-full shrink-0 ${statusColors[wi.status] || "bg-muted"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{wi.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{wi.project_name} · {wi.category}</p>
                      </div>
                      <StatusIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col h-[300px]">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-medium text-foreground">Upcoming Meetings (Today)</h3>
            <Link href="/dashboard/meetings" className="text-xs text-[#6366f1] hover:text-primary">View all</Link>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {meetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                <Clock className="h-8 w-8 text-[#262626]" />
                <p className="text-sm text-muted-foreground">No meetings scheduled for today.</p>
                <Link href="/dashboard/meetings" className="text-xs text-[#6366f1] hover:text-primary">Schedule a meeting</Link>
              </div>
            ) : (
              meetings.map((meeting) => (
                <div key={meeting.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background hover:border-muted transition-colors">
                  <div className="flex flex-col flex-1">
                    <p className="text-sm font-medium text-foreground">{meeting.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#14b8a6]"></span>
                        {meeting.scheduled_at ? format(new Date(meeting.scheduled_at), "h:mm a") : "TBD"}
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
                          <span>{Array.isArray(meeting.client) ? meeting.client[0]?.company_name : meeting.client.company_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {meeting.meeting_url && (
                    <a href={meeting.meeting_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#6366f1] hover:text-primary px-3 py-1.5 rounded-md bg-[#6366f1]/10">
                      Join
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col h-[300px]">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-medium text-foreground">Tasks Due Today</h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {dueTodayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                <p className="text-sm text-muted-foreground">No tasks due today.</p>
              </div>
            ) : (
              dueTodayTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background hover:border-muted transition-colors">
                  <div className="mt-0.5 border-2 border-muted rounded-sm w-4 h-4"></div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap pr-10">
                      <p className="text-sm font-medium leading-none text-foreground">{task.title}</p>
                      <span
                        className={`flex h-2 w-2 rounded-full ${task.priority === "Urgent"
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
                    <p className="text-xs text-muted-foreground">
                      {task.deadline ? format(new Date(task.deadline), "MMM d") : "No due date"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-medium text-foreground">Recent Activity Feed</h3>
          <Link href="/dashboard/activity" className="text-xs text-[#6366f1] hover:text-primary">View all activity</Link>
        </div>
        <div className="p-6">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
          ) : (
            <ActivityTimeline activities={activities} />
          )}
        </div>
      </div>
    </div>
  );
}
