"use client";

import { useEffect, useState, useTransition } from "react";
import { Project, columns } from "./project-columns";
import { ProjectDataTable } from "./project-data-table";
import { ProjectsKanban } from "./project-kanban-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutGrid, List, Plus, Loader2, FolderKanban } from "lucide-react";

type Client = { id: string; company_name: string };

interface ProjectViewSwitcherProps {
  initialData: Project[];
}

const STATUS_OPTIONS = ["Lead", "Planning", "In Progress", "Review", "Completed", "On Hold"] as const;

const EMPTY_FORM = {
  project_name: "",
  service_type: "",
  client_id: "",
  status: "Planning" as Project["status"],
  deadline: "",
  budget: "",
  description: "",
};

export function ProjectViewSwitcher({ initialData }: ProjectViewSwitcherProps) {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [projects, setProjects] = useState<Project[]>(initialData);
  const [clients, setClients] = useState<Client[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load clients for the dropdown
  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((p) => setClients(Array.isArray(p?.clients) ? p.clients : []))
      .catch(() => {});
  }, []);

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

  async function handleAdd() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          budget: form.budget ? Number(form.budget) : undefined,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) { setError(payload?.error ?? "Failed to create project"); return; }
      setProjects((prev) => [payload.project, ...prev]);
      setForm(EMPTY_FORM);
      setShowAddModal(false);
    });
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#F5F5F5]">Projects</h2>
          <p className="text-sm text-[#737373]">Manage and track your active projects.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#111111] border border-[#262626] rounded-lg p-1">
            <Button
              variant="ghost" size="sm"
              onClick={() => setView("kanban")}
              className={`h-8 px-3 rounded-md ${view === "kanban" ? "bg-[#262626] text-[#F5F5F5]" : "text-[#737373] hover:text-[#F5F5F5] hover:bg-[#171717]"}`}
            >
              <LayoutGrid className="mr-2 h-4 w-4" /> Board
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => setView("table")}
              className={`h-8 px-3 rounded-md ${view === "table" ? "bg-[#262626] text-[#F5F5F5]" : "text-[#737373] hover:text-[#F5F5F5] hover:bg-[#171717]"}`}
            >
              <List className="mr-2 h-4 w-4" /> List
            </Button>
          </div>
          <Button onClick={() => { setShowAddModal(true); setError(null); }} className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A] font-medium">
            <Plus className="h-4 w-4 mr-1" /> New Project
          </Button>
        </div>
      </div>

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="rounded-xl border border-[#262626] bg-[#111111] p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#F5F5F5]">New Project</h3>
          {error && <p className="text-xs text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded px-3 py-2">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "project_name", label: "Project Name *", placeholder: "Website Redesign" },
              { key: "service_type", label: "Service Type *", placeholder: "Web Development" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-[#737373] mb-1 block">{label}</label>
                <Input
                  value={(form as any)[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[#737373] mb-1 block">Client *</label>
              <select
                value={form.client_id}
                onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}
                className="w-full h-9 rounded-md border border-[#262626] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5] outline-none"
              >
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#737373] mb-1 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as Project["status"] }))}
                className="w-full h-9 rounded-md border border-[#262626] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5] outline-none"
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#737373] mb-1 block">Deadline</label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#737373] mb-1 block">Budget ($)</label>
              <Input
                type="number"
                value={form.budget}
                onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
                placeholder="5000"
                className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9"
              />
            </div>
            <div>
              <label className="text-xs text-[#737373] mb-1 block">Description</label>
              <Input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Brief project description"
                className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setShowAddModal(false)} className="text-[#A3A3A3]">Cancel</Button>
            <Button size="sm" disabled={isPending} onClick={handleAdd} className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A]">
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Create Project
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0">
        {projects.length === 0 && !showAddModal ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center">
            <FolderKanban className="h-10 w-10 text-[#404040] mb-4" />
            <p className="text-[#F5F5F5] font-medium mb-1">No projects yet</p>
            <p className="text-sm text-[#737373] mb-4">Create your first project to get started.</p>
            <Button size="sm" onClick={() => setShowAddModal(true)} className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A]">
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
