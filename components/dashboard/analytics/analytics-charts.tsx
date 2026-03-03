"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  FolderKanban,
  Gauge,
  ReceiptText,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";

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

interface AnalyticsChartsProps {
  hasData: boolean;
  metrics: AnalyticsMetric[];
  revenueTrend: RevenuePoint[];
  projectStatus: ProjectStatusPoint[];
  serviceMix: ServiceMixPoint[];
  taskStages: TaskStagePoint[];
  invoiceAging: InvoiceAgingPoint[];
  upcomingDeadlines: DeadlineItem[];
  insights: InsightItem[];
  teamWorkload?: TeamMemberWorkload[];
}

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const toneChipClass: Record<AnalyticsMetric["tone"], string> = {
  positive: "text-[#10b981] bg-[#10b981]/10 border-[#10b981]/40",
  neutral: "text-muted-foreground bg-muted border-border",
  warning: "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/40",
  critical: "text-[#fb7185] bg-[#fb7185]/10 border-[#fb7185]/40",
};

const insightToneClass: Record<InsightItem["tone"], string> = {
  positive: "border-[#10b981]/40 bg-[#10b981]/10 text-[#047857] dark:text-[#a7f3d0]",
  warning: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#92400e] dark:text-[#fde68a]",
  critical: "border-[#fb7185]/40 bg-[#fb7185]/10 text-[#9f1239] dark:text-[#fecdd3]",
};

const revenueConfig = {
  collected: {
    label: "Collected",
    color: "#06b6d4",
  },
  invoiced: {
    label: "Invoiced",
    color: "#f59e0b",
  },
} satisfies ChartConfig;

const projectConfig = {
  total: {
    label: "Projects",
    color: "#0ea5e9",
  },
} satisfies ChartConfig;

const taskConfig = {
  "To Do": {
    label: "To Do",
    color: "#f59e0b",
  },
  "In Progress": {
    label: "In Progress",
    color: "#0ea5e9",
  },
  "In Review": {
    label: "In Review",
    color: "#f97316",
  },
  Done: {
    label: "Done",
    color: "#10b981",
  },
} satisfies ChartConfig;

const agingConfig = {
  amount: {
    label: "Outstanding",
    color: "#fb7185",
  },
} satisfies ChartConfig;

const taskStageColors: Record<string, string> = {
  "To Do": "#f59e0b",
  "In Progress": "#0ea5e9",
  "In Review": "#f97316",
  Done: "#10b981",
};

const projectStatusColors: Record<string, string> = {
  Lead: "#94a3b8",
  Planning: "#0ea5e9",
  "In Progress": "#22d3ee",
  Review: "#f97316",
  "On Hold": "#f59e0b",
  Completed: "#10b981",
};

function taskColor(stage: string): string {
  return taskStageColors[stage] ?? "#64748b";
}

function insightIcon(tone: InsightItem["tone"]) {
  if (tone === "critical") return ShieldAlert;
  if (tone === "warning") return AlertTriangle;
  return CheckCircle2;
}

export function AnalyticsCharts({
  hasData,
  metrics,
  revenueTrend,
  projectStatus,
  serviceMix,
  taskStages,
  invoiceAging,
  upcomingDeadlines,
  insights,
  teamWorkload,
}: AnalyticsChartsProps) {
  const totalTaskCount = taskStages.reduce((sum, stage) => sum + stage.total, 0);

  return (
    <div className="flex flex-col gap-6 pb-8 max-w-7xl mx-auto w-full">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-accent to-card p-6 md:p-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#06b6d4]/10 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-[#f59e0b]/10 blur-3xl" />
        </div>

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-[#06b6d4]" />
              Performance command center
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
              Analytics Dashboard
            </h2>
            <p className="max-w-2xl text-sm md:text-base text-muted-foreground">
              Cash flow, delivery pace, and risk indicators in one view so you can act quickly.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              variant="outline"
            >
              <Link href="/dashboard/invoices">
                Review invoices
                <ArrowUpRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
            >
              <Link href="/dashboard/projects">
                Open projects
                <FolderKanban className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {!hasData ? (
        <Card className="bg-card border-border text-foreground">
          <CardContent className="py-12 flex flex-col items-center text-center gap-3">
            <CircleDashed className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No analytics data yet.</p>
            <p className="text-xs text-muted-foreground/70 max-w-md">
              Add clients, projects, invoices, and tasks to unlock full trend tracking.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="bg-card border-border text-foreground gap-4">
            <CardHeader className="px-5 pt-5 pb-0">
              <div className="flex items-center justify-between gap-2">
                <CardDescription className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                  {metric.label}
                </CardDescription>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${toneChipClass[metric.tone]}`}>
                  {metric.trend}
                </span>
              </div>
              <CardTitle className="text-2xl font-semibold">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 text-xs text-muted-foreground/70">{metric.helper}</CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        <Card className="bg-card border-border text-foreground xl:col-span-3">
          <CardHeader className="px-5 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Revenue Momentum</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Invoiced vs collected revenue across the past 8 months
                </CardDescription>
              </div>
              <Gauge className="h-4 w-4 text-[#06b6d4]" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-4">
            {revenueTrend.length > 0 ? (
              <ChartContainer config={revenueConfig} className="min-h-[320px] w-full">
                <AreaChart accessibilityLayer data={revenueTrend} margin={{ top: 18, left: 8, right: 8 }}>
                  <defs>
                    <linearGradient id="collectedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-collected)" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="var(--color-collected)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="invoicedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-invoiced)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-invoiced)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} className="stroke-border" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} className="fill-muted-foreground" />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="invoiced"
                    fill="url(#invoicedFill)"
                    stroke="var(--color-invoiced)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    fill="url(#collectedFill)"
                    stroke="var(--color-collected)"
                    strokeWidth={2.2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[260px] grid place-items-center text-sm text-muted-foreground">No revenue trend yet.</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border text-foreground xl:col-span-2">
          <CardHeader className="px-5 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Project Status Mix</CardTitle>
                <CardDescription className="text-muted-foreground">Current distribution by stage</CardDescription>
              </div>
              <FolderKanban className="h-4 w-4 text-[#38bdf8]" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-4">
            {projectStatus.length > 0 ? (
              <ChartContainer config={projectConfig} className="min-h-[320px] w-full">
                <BarChart accessibilityLayer data={projectStatus} layout="vertical" margin={{ left: 12, right: 14 }}>
                  <CartesianGrid horizontal={false} className="stroke-border" />
                  <YAxis
                    type="category"
                    dataKey="status"
                    tickLine={false}
                    axisLine={false}
                    width={90}
                    className="fill-muted-foreground"
                  />
                  <XAxis type="number" tickLine={false} axisLine={false} className="fill-muted-foreground" />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {projectStatus.map((entry) => (
                      <Cell key={entry.status} fill={projectStatusColors[entry.status] ?? "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[260px] grid place-items-center text-sm text-muted-foreground">No project status data yet.</div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="bg-card border-border text-foreground">
          <CardHeader className="px-5 pt-5">
            <CardTitle className="text-base">Service Mix</CardTitle>
            <CardDescription className="text-muted-foreground">Most active service lines and completion split</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            {serviceMix.length > 0 ? (
              serviceMix.map((service) => {
                const completion = service.total === 0 ? 0 : Math.round((service.completed / service.total) * 100);
                return (
                  <div key={service.service} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-foreground truncate">{service.service}</span>
                      <span className="text-muted-foreground">{service.total}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#0ea5e9] to-[#10b981]" style={{ width: `${completion}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                      <span>{service.completed} completed</span>
                      <span>{service.inFlight} in-flight</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No service mix data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border text-foreground">
          <CardHeader className="px-5 pt-5">
            <CardTitle className="text-base">Task Flow</CardTitle>
            <CardDescription className="text-muted-foreground">Distribution of tasks across workflow stages</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {taskStages.length > 0 ? (
              <>
                <ChartContainer config={taskConfig} className="min-h-[220px] w-full">
                  <PieChart accessibilityLayer>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="stage" />} />
                    <Pie data={taskStages} dataKey="total" nameKey="stage" innerRadius={62} outerRadius={88} strokeWidth={4}>
                      {taskStages.map((stage) => (
                        <Cell key={stage.stage} fill={taskColor(stage.stage)} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {taskStages.map((stage) => (
                    <div key={stage.stage} className="rounded-lg border border-border bg-muted/50 px-3 py-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: taskColor(stage.stage) }} />
                        {stage.stage}
                      </div>
                      <p className="text-sm font-medium text-foreground mt-1">
                        {stage.total}
                        <span className="text-xs text-muted-foreground/70 ml-1">
                          ({totalTaskCount === 0 ? 0 : Math.round((stage.total / totalTaskCount) * 100)}%)
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No task flow data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border text-foreground">
          <CardHeader className="px-5 pt-5">
            <CardTitle className="text-base">Invoice Aging</CardTitle>
            <CardDescription className="text-muted-foreground">Open invoice concentration by age bucket</CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-5">
            {invoiceAging.length > 0 ? (
              <>
                <ChartContainer config={agingConfig} className="min-h-[220px] w-full">
                  <BarChart accessibilityLayer data={invoiceAging} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} className="stroke-border" />
                    <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} className="fill-muted-foreground" />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Bar dataKey="amount" fill="var(--color-amount)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartContainer>
                <div className="px-2 mt-2 space-y-2">
                  {invoiceAging.map((bucket) => (
                    <div key={bucket.bucket} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{bucket.bucket}</span>
                      <span className="text-foreground">
                        {bucket.total} · {moneyFormatter.format(bucket.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="px-2 py-3 text-sm text-muted-foreground">No open invoices right now.</div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="bg-card border-border text-foreground">
          <CardHeader className="px-5 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
                <CardDescription className="text-muted-foreground">Projects and tasks sorted by due date</CardDescription>
              </div>
              <CalendarClock className="h-4 w-4 text-[#38bdf8]" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2.5">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-muted/50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border border-border px-2 py-0.5">{item.type}</span>
                        <span>{item.status}</span>
                        {item.priority ? <span>Priority: {item.priority}</span> : null}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{item.dueLabel}</p>
                      <p className="text-xs text-foreground mt-1">{item.daysLabel}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming task or project deadlines.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border text-foreground">
          <CardHeader className="px-5 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Recommended Actions</CardTitle>
                <CardDescription className="text-muted-foreground">Automated insights from current performance signals</CardDescription>
              </div>
              <ReceiptText className="h-4 w-4 text-[#f59e0b]" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2.5">
            {insights.map((item, idx) => {
              const Icon = insightIcon(item.tone);
              return (
                <div key={`${item.title}-${idx}`} className={`rounded-xl border p-3 ${insightToneClass[item.tone]}`}>
                  <div className="flex items-start gap-2.5">
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-tight">{item.title}</p>
                      <p className="text-xs leading-relaxed opacity-90">{item.detail}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      {/* Phase 6.10: Team Workload */}
      {teamWorkload && teamWorkload.length > 0 && (
        <section>
          <Card className="bg-card border-border text-foreground">
            <CardHeader className="px-5 pt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Team Workload</CardTitle>
                  <CardDescription className="text-muted-foreground">Work items per member, grouped by status</CardDescription>
                </div>
                <Users className="h-4 w-4 text-[#38bdf8]" />
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              {teamWorkload.map((member) => {
                const max = Math.max(...teamWorkload.map(m => m.total), 1);
                return (
                  <div key={member.name} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-foreground font-medium truncate">{member.name}</span>
                      <span className="text-muted-foreground text-xs">{member.total} items</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden flex" style={{ width: `${Math.max(20, (member.total / max) * 100)}%` }}>
                      {member.done > 0 && (
                        <div className="h-full bg-[#10b981]" style={{ width: `${(member.done / member.total) * 100}%` }} title={`Done: ${member.done}`} />
                      )}
                      {member.in_review > 0 && (
                        <div className="h-full bg-[#a855f7]" style={{ width: `${(member.in_review / member.total) * 100}%` }} title={`In Review: ${member.in_review}`} />
                      )}
                      {member.in_progress > 0 && (
                        <div className="h-full bg-[#3b82f6]" style={{ width: `${(member.in_progress / member.total) * 100}%` }} title={`In Progress: ${member.in_progress}`} />
                      )}
                      {member.not_started > 0 && (
                        <div className="h-full bg-[#737373]" style={{ width: `${(member.not_started / member.total) * 100}%` }} title={`Not Started: ${member.not_started}`} />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                      {member.done > 0 && <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />{member.done} done</span>}
                      {member.in_review > 0 && <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#a855f7]" />{member.in_review} review</span>}
                      {member.in_progress > 0 && <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />{member.in_progress} active</span>}
                      {member.not_started > 0 && <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#737373]" />{member.not_started} pending</span>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

