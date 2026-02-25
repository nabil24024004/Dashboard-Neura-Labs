import { createAdminClient } from "@/lib/supabase/admin";
import { PaymentsDataTable } from "@/components/dashboard/payments/payments-data-table";
import { columns, Payment } from "@/components/dashboard/payments/payments-columns";

export default async function PaymentsPage() {
  const supabase = createAdminClient();

  const { data: rawPayments, error } = await supabase
    .from("payments")
    .select("id,invoice_id,amount,payment_date,payment_method,notes,created_at,invoices(invoice_number,amount,clients(company_name))")
    .order("payment_date", { ascending: false });

  const safePaymentsRows = error ? [] : (rawPayments ?? []);

  const payments: Payment[] = safePaymentsRows.map((pay: any) => ({
    id: pay.id,
    invoice_number: pay.invoices?.invoice_number ?? "—",
    client_name: (pay.invoices as any)?.clients?.company_name ?? "—",
    amount: Number(pay.amount),
    payment_date: pay.payment_date,
    payment_method: pay.payment_method ?? "—",
    notes: pay.notes ?? null,
  }));

  // ── Real stats ──
  const thirtyDaysAgo = new Date(Date.now() - 86400000 * 30).toISOString().split("T")[0];

  // Total received in last 30 days
  const totalReceived30d = safePaymentsRows
    .filter((p: any) => p.payment_date >= thirtyDaysAgo)
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

  // Outstanding balance: sum of pending/overdue/partial/draft invoice amounts minus total payments received
  const { data: openInvoices } = await supabase
    .from("invoices")
    .select("amount")
    .in("status", ["Pending", "Overdue", "Partial"]);

  const outstandingBalance = (openInvoices ?? []).reduce((sum, inv) => sum + Number(inv.amount), 0);

  // Avg days to pay: for Paid invoices, payment_date - issue_date
  const { data: paidInvoices } = await supabase
    .from("invoices")
    .select("issue_date,id")
    .eq("status", "Paid");

  let avgDaysToPay = 0;
  if (paidInvoices && paidInvoices.length > 0) {
    const invoiceIds = paidInvoices.map((i) => i.id);
    const { data: matchedPayments } = await supabase
      .from("payments")
      .select("invoice_id,payment_date")
      .in("invoice_id", invoiceIds);

    const issueMap = Object.fromEntries((paidInvoices ?? []).map((i) => [i.id, i.issue_date]));
    const daysArr: number[] = [];
    (matchedPayments ?? []).forEach((p: any) => {
      const issueDate = issueMap[p.invoice_id];
      if (issueDate && p.payment_date) {
        const diff = Math.round((new Date(p.payment_date).getTime() - new Date(issueDate).getTime()) / 86400000);
        if (diff >= 0) daysArr.push(diff);
      }
    });
    if (daysArr.length > 0) {
      avgDaysToPay = Math.round(daysArr.reduce((a, b) => a + b, 0) / daysArr.length);
    }
  }

  return (
    <PaymentsDataTable
      columns={columns}
      data={payments}
      totalReceived30d={totalReceived30d}
      outstandingBalance={outstandingBalance}
      avgDaysToPay={avgDaysToPay}
    />
  );
}
