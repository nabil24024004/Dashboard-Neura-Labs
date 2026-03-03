"use client";

import { useEffect, useState, useTransition } from "react";
import { Project, columns } from "./project-columns";
import { ProjectDataTable } from "./project-data-table";
import { ProjectsKanban } from "./project-kanban-view";
import { ProjectWizard } from "./project-wizard";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, Plus, FolderKanban } from "lucide-react";

interface ProjectViewSwitcherProps {
  initialData: Project[];
}

export function ProjectViewSwitcher({ initialData }: ProjectViewSwitcherProps) {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [projects, setProjects] = useState<Project[]>(initialData);
  const [showWizard, setShowWizard] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await fetch("/api/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setProjects((prev) => prev.filter((p) => p.id !== id));
    });
  }

  function handleProjectCreated(project: Record<string, unknown>) {
    setProjects((prev) => [project as unknown as Project, ...prev]);
  }

  // Columns with live delete wired in
  const columnsWithActions = [
    ...columns.filter((c) => c.id !== "actions"),
    {
      id: "actions",
      cell: ({ row }: any) => (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => handleDelete(row.original.id)}
          className="text-[#ef4444] hover:text-[#ef4444] hover:bg-[#ef4444]/10"
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Projects</h2>
          <p className="text-sm text-muted-foreground">Manage and track your active projects.</p>
        </div>
        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-3">
          <div className="flex items-center bg-card border border-border rounded-lg p-1 shrink-0">
            <Button
              variant="ghost" size="sm"
              onClick={() => setView("kanban")}
              className={`h-8 px-3 rounded-md ${view === "kanban" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
            >
              <LayoutGrid className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Board</span>
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => setView("table")}
              className={`h-8 px-3 rounded-md ${view === "table" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
            >
              <List className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">List</span>
            </Button>
          </div>
          <Button onClick={() => setShowWizard(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-1" /> New Project
          </Button>
        </div>
      </div>

      {/* 3-Step Project Wizard */}
      <ProjectWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onProjectCreated={handleProjectCreated}
      />

      <div className="flex-1 min-h-0">
        {projects.length === 0 && !showWizard ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center">
            <FolderKanban className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-foreground font-medium mb-1">No projects yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create your first project to get started.</p>
            <Button size="sm" onClick={() => setShowWizard(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="h-4 w-4 mr-1" /> New Project
            </Button>
          </div>
        ) : view === "table" ? (
          <ProjectDataTable columns={columnsWithActions as any} data={projects} />
        ) : (
          <ProjectsKanban initialProjects={projects} />
        )}
      </div>
    </div>
  );
}
