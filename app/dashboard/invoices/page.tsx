import { queryDocs, getDoc, serializeDoc } from "@/lib/firebase/db";
import { InvoicesDataTable } from "@/components/dashboard/invoices/invoices-data-table";
import { columns, Invoice } from "@/components/dashboard/invoices/invoices-columns";
import { getEffectiveInvoiceStatus, type InvoiceSnapshot } from "@/lib/invoices/metrics";

export const dynamic = "force-dynamic";

function normalizeInvoiceStatus(value: unknown): Invoice["status"] {
  switch (value) {
    case "Pending":
    case "Paid":
    case "Overdue":
    case "Partial":
    case "Draft":
      return value;
    default:
      return "Draft";
  }
}

export default async function InvoicesPage() {
  const data = await queryDocs(
    "invoices",
    [],
    [{ field: "created_at", direction: "desc" }]
  );

  const invoices: Invoice[] = await Promise.all(
    data.map(async (inv) => {
      const d = serializeDoc(inv);
      let clientName = "Unknown Client";
      if (d.client_id) {
        const client = await getDoc("clients", d.client_id as string);
        if (client) clientName = (client.company_name as string) ?? clientName;
      }
      return {
        id: d.id as string,
        invoice_number: d.invoice_number as string,
        client_name: clientName,
        amount: Number(d.amount),
        currency: (d.currency as string) ?? "USD",
        issue_date: d.issue_date as string,
        due_date: d.due_date as string,
        status: getEffectiveInvoiceStatus(
          {
            id: d.id as string,
            amount: Number(d.amount),
            status: normalizeInvoiceStatus(d.status),
            due_date: (d.due_date as string | null) ?? null,
            issue_date: (d.issue_date as string | null) ?? null,
            created_at: (d.created_at as string | null) ?? null,
          } satisfies InvoiceSnapshot,
          new Date()
        ),
      };
    })
  );

  return <InvoicesDataTable columns={columns} data={invoices} />;
}
