import { createAdminClient } from "@/lib/supabase/admin";
import { ProjectViewSwitcher } from "@/components/dashboard/projects/project-view-switcher";

export default async function ProjectsPage() {
  const supabase = createAdminClient();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id,client_id,project_name,service_type,status,deadline,budget,progress,description,assigned_team,created_at")
    .order("created_at", { ascending: false });

  const safeProjects = error ? [] : (projects ?? []);

  return <ProjectViewSwitcher initialData={safeProjects} />;
}
