import { queryDocs } from "@/lib/firebase/db";
import { buildFinanceDashboardMetrics, getEffectiveInvoiceStatus, isOpenReceivable, type InvoiceSnapshot, type PaymentSnapshot } from "@/lib/invoices/metrics";
import { AnalyticsCharts } from "@/components/dashboard/analytics/analytics-charts";
import { AutoRefresh } from "@/components/dashboard/overview/auto-refresh";

export const dynamic = "force-dynamic";

interface PaymentRow {
  amount: number;
  payment_date: string | null;
  created_at: string;
}

interface ProjectRow {
  id: string;
  project_name: string | null;
  service_type: string | null;
  status: string;
  budget: number | null;
  progress: number | null;
  deadline: string | null;
  created_at: string;
}

interface InvoiceRow {
  id: string;
  amount: number;
  status: string | null;
  due_date: string | null;
  issue_date: string | null;
  created_at: string;
}

interface ClientRow {
  created_at: string;
}

interface MeetingRow {
  scheduled_at: string | null;
}

interface AgreementRow {
  status: string | null;
}

interface FileRow {
  file_size: number | null;
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: "Urgent" | "High" | "Medium" | "Low" | null;
  deadline: string | null;
  created_at: string;
}

interface AnalyticsMetric {
  label: string;
  value: string;
  helper: string;
  trend: string;
  tone: "positive" | "neutral" | "warning" | "critical";
}

interface RevenuePoint {
  month: string;
  collected: number;
  invoiced: number;
}

interface ProjectStatusPoint {
  status: string;
  total: number;
}

interface ServiceMixPoint {
  service: string;
  total: number;
  completed: number;
  inFlight: number;
}

interface TaskStagePoint {
  stage: string;
  total: number;
}

interface InvoiceAgingPoint {
  bucket: string;
  total: number;
  amount: number;
}

interface DeadlineItem {
  id: string;
  title: string;
  dueLabel: string;
  daysLabel: string;
  type: "Project" | "Task";
  status: string;
  priority: "Urgent" | "High" | "Medium" | "Low" | null;
}

interface InsightItem {
  title: string;
  detail: string;
  tone: "positive" | "warning" | "critical";
}

interface TeamMemberWorkload {
  name: string;
  total: number;
  not_started: number;
  in_progress: number;
  in_review: number;
  done: number;
}

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });
const dueDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthKey(value: string | null | undefined): string | null {
  const parsed = parseDate(value);
  if (!parsed) return null;
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${parsed.getFullYear()}-${month}`;
}

function buildLastMonthKeys(now: Date, count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const offset = count - index - 1;
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${month}`;
  });
}

function keyToMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return `${monthFormatter.format(d)} '${String(year).slice(-2)}`;
}

function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

function formatPercentage(value: number): string {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}%`;
  return `${rounded}%`;
}

function formatDayDelta(target: Date, baseline: Date): string {
  const deltaMs = target.getTime() - baseline.getTime();
  const day = 1000 * 60 * 60 * 24;
  const diff = Math.ceil(deltaMs / day);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `${diff} days`;
}

export default async function AnalyticsPage() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const [
    paymentsResult,
    projectsResult,
    invoicesResult,
    clientsResult,
    tasksResult,
    meetingsResult,
    agreementsResult,
    filesResult,
    wiAssignmentsResult,
    usersResult,
    workItemsResult
  ] = await Promise.all([
    queryDocs("payments", [], [{ field: "created_at", direction: "asc" }]),
    queryDocs("projects"),
    queryDocs("invoices"),
    queryDocs("clients", [{ field: "deleted_at", op: "==", value: null }]),
    queryDocs("tasks"),
    queryDocs("meetings"),
    queryDocs("agreements"),
    queryDocs("files"),
    queryDocs("work_item_assignments"),
    queryDocs("users"),
    queryDocs("work_items")
  ]);

  const payments = paymentsResult as unknown as PaymentRow[];
  const projects = projectsResult as unknown as ProjectRow[];
  const invoices = invoicesResult as unknown as InvoiceRow[];
  const clients = clientsResult as unknown as ClientRow[];
  const tasks = tasksResult as unknown as TaskRow[];
  const meetings = meetingsResult as unknown as MeetingRow[];
  const agreements = agreementsResult as unknown as AgreementRow[];
  const files = filesResult as unknown as FileRow[];

  const financeMetrics = buildFinanceDashboardMetrics({
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      amount: Number(invoice.amount) || 0,
      status: invoice.status as InvoiceSnapshot["status"],
      due_date: invoice.due_date,
      issue_date: invoice.issue_date,
      created_at: invoice.created_at,
    })),
    payments: payments.map((payment) => ({
      id: payment.created_at,
      amount: Number(payment.amount) || 0,
      payment_date: payment.payment_date,
      created_at: payment.created_at,
    })) satisfies PaymentSnapshot[],
    now,
  });

  // Join data for team workload
  const memberMap = new Map<string, TeamMemberWorkload>();
  for (const a of wiAssignmentsResult) {
    const user = usersResult.find((u) => u.id === a.member_id);
    const wi = workItemsResult.find((w) => w.id === a.work_item_id);

    // Fallback to name extraction or truncation if not found
    const name = user ? `${user.first_name} ${user.last_name}` : (a.member_id as string).slice(0, 8);
    const status = (wi?.status as string) || "not_started";

    if (!memberMap.has(a.member_id as string)) {
      memberMap.set(a.member_id as string, { name, total: 0, not_started: 0, in_progress: 0, in_review: 0, done: 0 });
    }
    const member = memberMap.get(a.member_id as string)!;
    member.total += 1;
    if (status === "not_started") member.not_started += 1;
    else if (status === "in_progress") member.in_progress += 1;
    else if (status === "in_review") member.in_review += 1;
    else if (status === "done") member.done += 1;
  }

  const teamWorkload: TeamMemberWorkload[] = Array.from(memberMap.values()).sort((a, b) => b.total - a.total);

  const totalCollected = financeMetrics.cashFlow.collectedAllTime;
  const totalInvoiced = invoices.reduce((sum, invoice) => {
    const status = getEffectiveInvoiceStatus(
      {
        id: invoice.id,
        amount: Number(invoice.amount) || 0,
        status: invoice.status as InvoiceSnapshot["status"],
        due_date: invoice.due_date,
        issue_date: invoice.issue_date,
        created_at: invoice.created_at,
      },
      now
    );
    if (status === "Draft") return sum;
    return sum + (Number(invoice.amount) || 0);
  }, 0);
  const paidAmount = financeMetrics.invoiceState.paidInvoiceAmount;
  const outstandingAmount = financeMetrics.invoiceState.openInvoiceAmount;

  const completedProjects = projects.filter((project) => project.status === "Completed").length;
  const activeProjects = projects.filter((project) => project.status !== "Completed").length;
  const completionRate = projects.length === 0 ? 0 : (completedProjects / projects.length) * 100;

  const openTasks = tasks.filter((task) => task.status !== "Done").length;
  const urgentTasks = tasks.filter((task) => task.status !== "Done" && task.priority === "Urgent").length;

  const currentMonthCollected = financeMetrics.cashFlow.collectedCurrentMonth;
  const previousMonthCollected = financeMetrics.cashFlow.collectedPreviousMonth;

  const currentMonthClients = clients.reduce((total, client) => {
    const date = parseDate(client.created_at);
    if (!date || date < currentMonthStart) return total;
    return total + 1;
  }, 0);

  const previousMonthClients = clients.reduce((total, client) => {
    const date = parseDate(client.created_at);
    if (!date || date < previousMonthStart || date >= currentMonthStart) return total;
    return total + 1;
  }, 0);

  const settlementRate = financeMetrics.invoiceState.settlementRate;
  const revenueDelta = percentageChange(currentMonthCollected, previousMonthCollected);
  const clientDelta = percentageChange(currentMonthClients, previousMonthClients);

  const monthlyCollected: Record<string, number> = {};
  const monthlyInvoiced: Record<string, number> = {};
  for (const p of payments) {
    const key = monthKey(p.payment_date || p.created_at);
    if (!key) continue;
    monthlyCollected[key] = (monthlyCollected[key] ?? 0) + (p.amount ?? 0);
  }

  for (const invoice of invoices) {
    const key = monthKey(invoice.issue_date || invoice.created_at);
    if (!key) continue;
    monthlyInvoiced[key] = (monthlyInvoiced[key] ?? 0) + (invoice.amount ?? 0);
  }

  const monthKeys = buildLastMonthKeys(now, 8);
  const revenueTrend: RevenuePoint[] = monthKeys.map((key) => ({
    month: keyToMonthLabel(key),
    collected: monthlyCollected[key] ?? 0,
    invoiced: monthlyInvoiced[key] ?? 0,
  }));

  const statusOrder = ["Lead", "Planning", "In Progress", "Review", "On Hold", "Completed"];
  const projectStatusMap: Record<string, number> = {};
  for (const project of projects) {
    projectStatusMap[project.status] = (projectStatusMap[project.status] ?? 0) + 1;
  }

  const projectStatus: ProjectStatusPoint[] = statusOrder
    .map((status) => ({ status, total: projectStatusMap[status] ?? 0 }))
    .filter((item) => item.total > 0);

  const serviceMap: Record<string, { total: number; completed: number; inFlight: number }> = {};
  for (const p of projects) {
    const service = p.service_type || "General";
    if (!serviceMap[service]) serviceMap[service] = { total: 0, completed: 0, inFlight: 0 };
    serviceMap[service].total += 1;
    if (p.status === "Completed") {
      serviceMap[service].completed += 1;
    } else {
      serviceMap[service].inFlight += 1;
    }
  }

  const serviceMix: ServiceMixPoint[] = Object.entries(serviceMap)
    .map(([service, stats]) => ({ service, ...stats }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const taskOrder = ["To Do", "In Progress", "In Review", "Done"];
  const taskStages: TaskStagePoint[] = taskOrder
    .map((stage) => ({
      stage,
      total: tasks.filter((task) => task.status === stage).length,
    }))
    .filter((stage) => stage.total > 0);

  const agingOrder = ["Upcoming", "1-15 days", "16-30 days", "30+ days", "No due date"];
  const agingMap: Record<string, { total: number; amount: number }> = {
    Upcoming: { total: 0, amount: 0 },
    "1-15 days": { total: 0, amount: 0 },
    "16-30 days": { total: 0, amount: 0 },
    "30+ days": { total: 0, amount: 0 },
    "No due date": { total: 0, amount: 0 },
  };

  for (const invoice of invoices) {
    const effectiveStatus = getEffectiveInvoiceStatus(
      {
        id: invoice.id,
        amount: Number(invoice.amount) || 0,
        status: invoice.status as InvoiceSnapshot["status"],
        due_date: invoice.due_date,
        issue_date: invoice.issue_date,
        created_at: invoice.created_at,
      },
      now
    );
    if (!isOpenReceivable(effectiveStatus)) continue;
    let bucket = "No due date";
    const due = parseDate(invoice.due_date);
    if (due) {
      const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) bucket = "Upcoming";
      else if (diffDays <= 15) bucket = "1-15 days";
      else if (diffDays <= 30) bucket = "16-30 days";
      else bucket = "30+ days";
    }

    agingMap[bucket].total += 1;
    agingMap[bucket].amount += invoice.amount ?? 0;
  }

  const invoiceAging: InvoiceAgingPoint[] = agingOrder
    .map((bucket) => ({
      bucket,
      total: agingMap[bucket].total,
      amount: agingMap[bucket].amount,
    }))
    .filter((bucket) => bucket.total > 0);

  const upcomingProjectDeadlines = projects
    .filter((project) => project.status !== "Completed")
    .map((project) => {
      const due = parseDate(project.deadline);
      if (!due) return null;
      return {
        id: `project-${project.id}`,
        title: project.project_name || "Untitled Project",
        dueDate: due,
        type: "Project" as const,
        status: project.status,
        priority: null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const upcomingTaskDeadlines = tasks
    .filter((task) => task.status !== "Done")
    .map((task) => {
      const due = parseDate(task.deadline);
      if (!due) return null;
      return {
        id: `task-${task.id}`,
        title: task.title,
        dueDate: due,
        type: "Task" as const,
        status: task.status,
        priority: task.priority,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const upcomingDeadlines: DeadlineItem[] = [...upcomingProjectDeadlines, ...upcomingTaskDeadlines]
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 8)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      dueLabel: dueDateFormatter.format(entry.dueDate),
      daysLabel: formatDayDelta(entry.dueDate, today),
      type: entry.type,
      status: entry.status,
      priority: entry.priority,
    }));

  const dueSoonTasks = tasks.reduce((count, task) => {
    if (task.status === "Done") return count;
    const due = parseDate(task.deadline);
    if (!due || due < today || due > nextWeek) return count;
    return count + 1;
  }, 0);

  const overdueInvoicesCount = invoices.reduce((count, invoice) => {
    const effectiveStatus = getEffectiveInvoiceStatus(
      {
        id: invoice.id,
        amount: Number(invoice.amount) || 0,
        status: invoice.status as InvoiceSnapshot["status"],
        due_date: invoice.due_date,
        issue_date: invoice.issue_date,
        created_at: invoice.created_at,
      },
      now
    );
    return effectiveStatus === "Overdue" ? count + 1 : count;
  }, 0);

  const meetingsThisWeek = meetings.reduce((count, meeting) => {
    const scheduled = parseDate(meeting.scheduled_at);
    if (!scheduled || scheduled < today) return count;
    if (scheduled > nextWeek) return count;
    return count + 1;
  }, 0);
  const pendingAgreements = agreements.filter((agreement) => agreement.status === "Pending Signature").length;
  const activeWorkItems = workItemsResult.filter((item) => item.status !== "done").length;
  const totalFiles = files.length;
  const totalFileBytes = files.reduce((sum, file) => sum + (Number(file.file_size) || 0), 0);

  const insights: InsightItem[] = [];
  if (overdueInvoicesCount > 0) {
    insights.push({
      title: `${overdueInvoicesCount} overdue invoices need follow-up`,
      detail: `${moneyFormatter.format(outstandingAmount)} is still uncollected. Prioritize reminder flow this week.`,
      tone: "critical",
    });
  }

  if (settlementRate < 75) {
    insights.push({
      title: "Settlement rate is below target",
      detail: `Current settlement rate is ${Math.round(settlementRate)}%. Target a minimum of 80% to stabilize receivables.`,
      tone: "warning",
    });
  } else {
    insights.push({
      title: "Invoice settlement is in a healthy range",
      detail: `${Math.round(settlementRate)}% of non-draft invoiced value is marked settled.`,
      tone: "positive",
    });
  }

  if (dueSoonTasks > 0 || urgentTasks > 0) {
    insights.push({
      title: `${dueSoonTasks} tasks due in 7 days, ${urgentTasks} marked urgent`,
      detail: "Rebalance assignment before deadlines stack up and impact delivery pace.",
      tone: "warning",
    });
  } else {
    insights.push({
      title: "Task pipeline is under control",
      detail: "No urgent or near-term task bottlenecks detected.",
      tone: "positive",
    });
  }

  if (insights.length < 3) {
    insights.push({
      title: "Expand your service mix insights",
      detail: "Track margin and cycle time by service to make planning decisions faster.",
      tone: "positive",
    });
  }

  const totalBudget = projects.reduce((sum, project) => sum + (project.budget ?? 0), 0);
  const averageProgress =
    activeProjects === 0
      ? 0
      : projects
        .filter((project) => project.status !== "Completed")
        .reduce((sum, project) => sum + Math.max(0, Math.min(100, project.progress ?? 0)), 0) / activeProjects;

  const formatFileSize = (bytes: number): string => {
    if (bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    const decimals = value >= 10 || unitIndex === 0 ? 0 : 1;
    return `${value.toFixed(decimals)} ${units[unitIndex]}`;
  };

  const metrics: AnalyticsMetric[] = [
    {
      label: "Collected Revenue",
      value: moneyFormatter.format(totalCollected),
      helper: "All-time payments",
      trend: `${formatPercentage(revenueDelta)} vs last month`,
      tone: revenueDelta > 0 ? "positive" : revenueDelta < -5 ? "critical" : "neutral",
    },
    {
      label: "Monthly Cash In",
      value: moneyFormatter.format(currentMonthCollected),
      helper: `Prev month: ${moneyFormatter.format(previousMonthCollected)}`,
      trend: formatPercentage(revenueDelta),
      tone: revenueDelta >= 0 ? "positive" : "warning",
    },
    {
      label: "Settlement Rate",
      value: `${Math.round(settlementRate)}%`,
      helper: `${moneyFormatter.format(paidAmount)} paid of ${moneyFormatter.format(totalInvoiced)}`,
      trend: settlementRate >= 80 ? "Status-led" : "Needs attention",
      tone: settlementRate >= 80 ? "positive" : settlementRate >= 65 ? "warning" : "critical",
    },
    {
      label: "Project Completion",
      value: `${Math.round(completionRate)}%`,
      helper: `${completedProjects}/${projects.length} delivered`,
      trend: `${activeProjects} currently active`,
      tone: completionRate >= 65 ? "positive" : completionRate >= 40 ? "neutral" : "warning",
    },
    {
      label: "Open Tasks",
      value: openTasks.toString(),
      helper: `${urgentTasks} urgent · ${dueSoonTasks} due soon`,
      trend: openTasks > 20 ? "Backlog heavy" : "Healthy workload",
      tone: urgentTasks > 0 ? "warning" : "neutral",
    },
    {
      label: "Client Growth",
      value: `+${currentMonthClients}`,
      helper: `${clients.length} active clients total`,
      trend: `${formatPercentage(clientDelta)} vs last month`,
      tone: clientDelta > 0 ? "positive" : clientDelta < 0 ? "warning" : "neutral",
    },
    {
      label: "Open Invoice Balance",
      value: moneyFormatter.format(outstandingAmount),
      helper: `${overdueInvoicesCount} overdue`,
      trend: `${financeMetrics.invoiceState.openInvoiceCount} open invoices`,
      tone: overdueInvoicesCount > 0 ? "critical" : "neutral",
    },
    {
      label: "Pipeline Budget",
      value: moneyFormatter.format(totalBudget),
      helper: `${activeProjects} active projects`,
      trend: `Avg progress ${Math.round(averageProgress)}%`,
      tone: averageProgress >= 60 ? "positive" : "warning",
    },
    {
      label: "Meetings This Week",
      value: meetingsThisWeek.toString(),
      helper: "Upcoming scheduled meetings",
      trend: meetingsThisWeek > 0 ? "Scheduled" : "No meetings",
      tone: meetingsThisWeek > 0 ? "neutral" : "warning",
    },
    {
      label: "Pending Agreements",
      value: pendingAgreements.toString(),
      helper: "Awaiting signature",
      trend: pendingAgreements > 0 ? "Needs follow-up" : "Clear",
      tone: pendingAgreements > 0 ? "warning" : "positive",
    },
    {
      label: "Active Work Items",
      value: activeWorkItems.toString(),
      helper: `${teamWorkload.length} members assigned`,
      trend: activeWorkItems > 0 ? "In delivery" : "No active items",
      tone: activeWorkItems > 0 ? "neutral" : "warning",
    },
    {
      label: "Files Stored",
      value: totalFiles.toString(),
      helper: `${formatFileSize(totalFileBytes)} total storage`,
      trend: totalFiles > 0 ? "Documents available" : "No files yet",
      tone: totalFiles > 0 ? "neutral" : "warning",
    },
  ];

  const hasData =
    payments.length > 0 ||
    projects.length > 0 ||
    invoices.length > 0 ||
    clients.length > 0 ||
    tasks.length > 0 ||
    meetings.length > 0 ||
    agreements.length > 0 ||
    files.length > 0 ||
    workItemsResult.length > 0;

  return (
    <>
      <AutoRefresh intervalMs={30_000} />
      <AnalyticsCharts
        hasData={hasData}
        metrics={metrics}
        revenueTrend={revenueTrend}
        projectStatus={projectStatus}
        serviceMix={serviceMix}
        taskStages={taskStages}
        invoiceAging={invoiceAging}
        upcomingDeadlines={upcomingDeadlines}
        insights={insights}
        teamWorkload={teamWorkload}
      />
    </>
  );
}
