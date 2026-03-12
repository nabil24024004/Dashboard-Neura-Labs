import { queryDocs, getDoc, serializeDoc } from "@/lib/firebase/db";
import { PaymentsDataTable } from "@/components/dashboard/payments/payments-data-table";
import { columns, Payment } from "@/components/dashboard/payments/payments-columns";
import { summarizeInvoiceState, type InvoiceSnapshot } from "@/lib/invoices/metrics";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const [rawPayments, allInvoices] = await Promise.all([
    queryDocs("payments", [], [{ field: "created_at", direction: "desc" }]),
    queryDocs("invoices"),
  ]);

  // Enrich payments with invoice + client info
  const payments: Payment[] = await Promise.all(
    rawPayments.map(async (pay) => {
      const p = serializeDoc(pay);
      let invoiceNumber = "—";
      let clientName = "—";
      if (p.invoice_id) {
        const invoice = await getDoc("invoices", p.invoice_id as string);
        if (invoice) {
          invoiceNumber = (invoice.invoice_number as string) ?? "—";
          if (invoice.client_id) {
            const client = await getDoc("clients", invoice.client_id as string);
            if (client) clientName = (client.company_name as string) ?? "—";
          }
        }
      }
      return {
        id: p.id as string,
        invoice_number: invoiceNumber,
        client_name: clientName,
        amount: Number(p.amount),
        payment_date: typeof p.payment_date === "string" ? p.payment_date : "",
        payment_method: (p.payment_method as string) ?? "—",
        notes: (p.notes as string) ?? null,
      };
    })
  );

  const invoiceState = summarizeInvoiceState(
    allInvoices.map((invoice) => ({
      id: invoice.id,
      amount: Number(invoice.amount) || 0,
      status: invoice.status as InvoiceSnapshot["status"],
      due_date: (invoice.due_date as string | null) ?? null,
      issue_date: (invoice.issue_date as string | null) ?? null,
      created_at: (invoice.created_at as string | null) ?? null,
    })),
    new Date()
  );

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const totalReceived30d = rawPayments.reduce((sum, payment) => {
    const rawDate = (payment.payment_date as string | null) ?? (payment.created_at as string | null);
    if (!rawDate) return sum;
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime()) || parsed < thirtyDaysAgo) return sum;
    return sum + Number(payment.amount);
  }, 0);
  const outstandingBalance = invoiceState.openInvoiceAmount;

  const paidInvoices = allInvoices.filter((inv) => inv.status === "Paid");
  let avgDaysToPay = 0;
  if (paidInvoices.length > 0) {
    const paidInvoiceIds = paidInvoices.map((i) => i.id);
    const matchedPayments = rawPayments.filter((p) => paidInvoiceIds.includes(p.invoice_id as string));
    const issueMap = Object.fromEntries(paidInvoices.map((i) => [i.id, i.issue_date]));
    const daysArr: number[] = [];
    matchedPayments.forEach((p) => {
      const issueDate = issueMap[p.invoice_id as string];
      if (issueDate && p.payment_date) {
        const diff = Math.round(
          (new Date(p.payment_date as string).getTime() - new Date(issueDate as string).getTime()) / 86400000
        );
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
