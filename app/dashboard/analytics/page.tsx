import { createAdminClient } from "@/lib/supabase/admin";
import { AnalyticsCharts } from "@/components/dashboard/analytics/analytics-charts";
import { BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

interface PaymentRow {
  amount: number;
  payment_date: string | null;
  created_at: string;
}

interface ProjectRow {
  service_type: string | null;
  status: string;
}

interface InvoiceRow {
  amount: number;
  status: string;
}

interface ClientRow {
  created_at: string;
}

export default async function AnalyticsPage() {
  const db = createAdminClient();

  const [paymentsResult, projectsResult, invoicesResult, clientsResult] = await Promise.all([
    db.from("payments").select("amount, payment_date, created_at").order("created_at", { ascending: true }),
    db.from("projects").select("service_type, status"),
    db.from("invoices").select("amount, status"),
    db.from("clients").select("created_at").is("deleted_at", null),
  ]);

  const payments = (paymentsResult.data ?? []) as PaymentRow[];
  const projects = (projectsResult.data ?? []) as ProjectRow[];
  const invoices = (invoicesResult.data ?? []) as InvoiceRow[];
  const clients = (clientsResult.data ?? []) as ClientRow[];

  // Build monthly revenue data from payments
  const revenueByMonth: Record<string, number> = {};
  for (const p of payments) {
    const date = p.payment_date || p.created_at;
    if (!date) continue;
    const monthKey = date.substring(0, 7); // "YYYY-MM"
    revenueByMonth[monthKey] = (revenueByMonth[monthKey] ?? 0) + (p.amount ?? 0);
  }

  const sortedMonths = Object.keys(revenueByMonth).sort();
  const last6Months = sortedMonths.slice(-6);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const revenueData = last6Months.map((key) => ({
    month: monthNames[parseInt(key.split("-")[1]) - 1],
    revenue: revenueByMonth[key],
  }));

  // Build project velocity by service type
  const projectsByType: Record<string, { completed: number; running: number }> = {};
  for (const p of projects) {
    const type = p.service_type || "Other";
    if (!projectsByType[type]) projectsByType[type] = { completed: 0, running: 0 };
    if (p.status === "Completed") {
      projectsByType[type].completed++;
    } else {
      projectsByType[type].running++;
    }
  }
  const projectData = Object.entries(projectsByType).map(([type, counts]) => ({
    type,
    ...counts,
  }));

  // Summary stats
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const totalProjects = projects.length;
  const completedProjects = projects.filter((p) => p.status === "Completed").length;
  const pendingInvoiceAmount = invoices
    .filter((i) => i.status === "Pending" || i.status === "Sent" || i.status === "Overdue")
    .reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const totalClients = clients.length;

  const hasData = payments.length > 0 || projects.length > 0;

  return (
    <div className="flex flex-col gap-6 h-full pb-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#F5F5F5]">Analytics Dashboard</h2>
          <p className="text-sm text-[#737373]">Business performance and operational metrics from your data.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[#262626] bg-[#111111]">
          <p className="text-xs text-[#737373] font-medium">Total Revenue</p>
          <p className="text-2xl font-semibold text-[#22c55e] mt-1">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#262626] bg-[#111111]">
          <p className="text-xs text-[#737373] font-medium">Projects</p>
          <p className="text-2xl font-semibold text-[#F5F5F5] mt-1">{completedProjects}/{totalProjects}</p>
          <p className="text-xs text-[#404040]">completed</p>
        </div>
        <div className="p-4 rounded-xl border border-[#262626] bg-[#111111]">
          <p className="text-xs text-[#737373] font-medium">Outstanding Invoices</p>
          <p className="text-2xl font-semibold text-[#f59e0b] mt-1">${pendingInvoiceAmount.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#262626] bg-[#111111]">
          <p className="text-xs text-[#737373] font-medium">Active Clients</p>
          <p className="text-2xl font-semibold text-[#F5F5F5] mt-1">{totalClients}</p>
        </div>
      </div>

      {hasData ? (
        <AnalyticsCharts revenueData={revenueData} projectData={projectData} />
      ) : (
        <div className="rounded-xl border border-[#262626] bg-[#111111] p-12 flex flex-col items-center justify-center gap-3">
          <BarChart3 className="h-12 w-12 text-[#262626]" />
          <p className="text-sm text-[#737373]">No chart data yet.</p>
          <p className="text-xs text-[#404040]">Charts will populate as you add projects and record payments.</p>
        </div>
      )}
    </div>
  );
}
