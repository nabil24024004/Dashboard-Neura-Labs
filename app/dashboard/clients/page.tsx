import { createAdminClient } from "@/lib/supabase/admin";
import { ClientsSplitView } from "@/components/dashboard/clients/client-split-view";

export default async function ClientsPage() {
  const supabase = createAdminClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id,company_name,contact_person,email,phone,country,status,notes,created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const safeClients = error ? [] : (clients ?? []);

  return <ClientsSplitView initialData={safeClients} />;
}
