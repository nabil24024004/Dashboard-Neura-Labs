import { queryDocs, serializeDoc } from "@/lib/firebase/db";
import { ProjectViewSwitcher } from "@/components/dashboard/projects/project-view-switcher";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const data = await queryDocs(
    "projects",
    [],
    [{ field: "created_at", direction: "desc" }]
  );

  const safeProjects = data.map((project) => serializeDoc(project)) as Parameters<
    typeof ProjectViewSwitcher
  >[0]["initialData"];

  return <ProjectViewSwitcher initialData={safeProjects} />;
}
