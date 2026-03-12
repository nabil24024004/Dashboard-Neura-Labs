import { queryDocs, serializeDoc } from "@/lib/firebase/db";
import { ContractsDataTable } from "@/components/dashboard/contracts/contracts-data-table";
import { columns, Contract } from "@/components/dashboard/contracts/contracts-columns";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const data = await queryDocs(
    "contracts",
    [{ field: "status", op: "!=", value: "Archived" }]
  );

  data.sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());

  const contracts: Contract[] = data.map((c) => {
    const d = serializeDoc(c);
    return {
      id: d.id as string,
      contract_type: d.contract_type as string,
      title: d.title as string,
      client_name: (d.client_name as string) ?? "",
      client_email: (d.client_email as string) ?? null,
      field_values: (d.field_values as Record<string, unknown>) ?? {},
      pdf_url: (d.pdf_url as string) ?? null,
      share_token: d.share_token as string,
      status: d.status as Contract["status"],
      created_by: d.created_by as string,
      created_at: d.created_at as string,
      updated_at: d.updated_at as string,
      expires_at: (d.expires_at as string) ?? null,
    };
  });

  return <ContractsDataTable columns={columns} data={contracts} />;
}
