import { createAdminClient } from "@/lib/supabase/admin";
import { AgreementsDataTable } from "@/components/dashboard/agreements/agreements-data-table";
import { columns, Agreement } from "@/components/dashboard/agreements/agreements-columns";

export default async function AgreementsPage() {
  const supabase = createAdminClient();

  const [{ data: agrData, error }, { data: clientsData }] = await Promise.all([
    supabase
      .from("agreements")
      .select("id,client_id,type,signed_date,expiry_date,document_link,status,notes,created_at,clients(company_name)")
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id,company_name").is("deleted_at", null).order("company_name"),
  ]);

  const safeAgreementRows = error ? [] : (agrData ?? []);

  const agreements: Agreement[] = safeAgreementRows.map((agr: any) => ({
    id: agr.id,
    client_id: agr.client_id,
    client_name: agr.clients?.company_name ?? "Unknown Client",
    type: agr.type,
    signed_date: agr.signed_date,
    expiry_date: agr.expiry_date,
    document_link: agr.document_link,
    status: agr.status ?? "Pending Signature",
    notes: agr.notes,
  }));

  const clients = (clientsData ?? []).map((c: any) => ({ id: c.id, company_name: c.company_name }));

  return (
    <AgreementsDataTable
      columns={columns as any}
      data={agreements}
      clients={clients}
    />
  );
}
