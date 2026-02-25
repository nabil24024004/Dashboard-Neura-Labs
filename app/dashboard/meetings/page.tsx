import { createAdminClient } from "@/lib/supabase/admin";
import { MeetingsDataTable } from "@/components/dashboard/meetings/meetings-data-table";
import { columns, Meeting } from "@/components/dashboard/meetings/meetings-columns";

export default async function MeetingsPage() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("meetings")
    .select(
      "id,client_id,project_id,title,scheduled_at,duration_minutes,platform,meeting_url,agenda,status,created_at,clients(company_name),projects(project_name)"
    )
    .order("scheduled_at", { ascending: true });

  const safeRows = error ? [] : (data ?? []);

  return (
    <MeetingsDataTable
      columns={columns}
      data={safeRows as unknown as Meeting[]}
    />
  );
}
