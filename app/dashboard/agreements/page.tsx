import { queryDocs, getDoc, serializeDoc } from "@/lib/firebase/db";
import { AgreementsDataTable } from "@/components/dashboard/agreements/agreements-data-table";
import { columns, Agreement } from "@/components/dashboard/agreements/agreements-columns";

export const dynamic = "force-dynamic";

export default async function AgreementsPage() {
  const [agrData, clientsData] = await Promise.all([
    queryDocs("agreements", [], [{ field: "created_at", direction: "desc" }]),
    queryDocs("clients", [{ field: "deleted_at", op: "==", value: null }]),
  ]);

  const agreements: Agreement[] = await Promise.all(
    agrData.map(async (agr) => {
      const d = serializeDoc(agr);
      let clientName = "Unknown Client";
      if (d.client_id) {
        const client = await getDoc("clients", d.client_id as string);
        if (client) clientName = (client.company_name as string) ?? clientName;
      }
      return {
        id: d.id,
        client_id: d.client_id,
        client_name: clientName,
        type: d.type,
        signed_date: d.signed_date,
        expiry_date: d.expiry_date,
        document_link: d.document_link,
        status: d.status ?? "Pending Signature",
        notes: d.notes,
      } as Agreement;
    })
  );

  const clients = clientsData
    .map((c) => ({ id: c.id, company_name: c.company_name as string }))
    .sort((a, b) => a.company_name.localeCompare(b.company_name));

  return (
    <AgreementsDataTable
      columns={columns}
      data={agreements}
      clients={clients}
    />
  );
}
