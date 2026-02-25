import { createAdminClient } from "@/lib/supabase/admin";
import { InvoicesDataTable } from "@/components/dashboard/invoices/invoices-data-table";
import { columns, Invoice } from "@/components/dashboard/invoices/invoices-columns";

export default async function InvoicesPage() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("invoices")
    .select("id,client_id,project_id,invoice_number,amount,currency,issue_date,due_date,status,notes,tax_percent,created_at,clients(company_name)")
    .order("issue_date", { ascending: false });

  const safeRows = error ? [] : (data ?? []);

  const invoices: Invoice[] = safeRows.map((inv: any) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    client_name: inv.clients?.company_name ?? "Unknown Client",
    amount: Number(inv.amount),
    currency: inv.currency ?? "USD",
    issue_date: inv.issue_date,
    due_date: inv.due_date,
    status: inv.status ?? "Draft",
  }));

  return <InvoicesDataTable columns={columns} data={invoices} />;
}
