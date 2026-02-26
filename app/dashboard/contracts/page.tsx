import { createAdminClient } from "@/lib/supabase/admin";
import { ContractsDataTable } from "@/components/dashboard/contracts/contracts-data-table";
import { columns, Contract } from "@/components/dashboard/contracts/contracts-columns";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("contracts")
    .select(
      "id,contract_type,title,client_name,client_email,field_values,pdf_url,share_token,status,created_by,created_at,updated_at,expires_at"
    )
    .neq("status", "Archived")
    .order("created_at", { ascending: false });

  const contracts: Contract[] = error
    ? []
    : (data ?? []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        contract_type: c.contract_type as string,
        title: c.title as string,
        client_name: (c.client_name as string) ?? "",
        client_email: (c.client_email as string) ?? null,
        field_values: (c.field_values as Record<string, unknown>) ?? {},
        pdf_url: (c.pdf_url as string) ?? null,
        share_token: c.share_token as string,
        status: c.status as Contract["status"],
        created_by: c.created_by as string,
        created_at: c.created_at as string,
        updated_at: c.updated_at as string,
        expires_at: (c.expires_at as string) ?? null,
      }));

  return <ContractsDataTable columns={columns as any} data={contracts} />;
}
