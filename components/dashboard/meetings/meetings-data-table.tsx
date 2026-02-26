"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ColumnDef, ColumnFiltersState, SortingState, VisibilityState,
  flexRender, getCoreRowModel, getFilteredRowModel,
  getPaginationRowModel, getSortedRowModel, useReactTable,
} from "@tanstack/react-table";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Loader2, CalendarClock } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { Meeting } from "./meetings-columns";

type Client = { id: string; company_name: string };
type ProjectOption = { id: string; project_name: string };

const EMPTY_FORM = {
  title: "",
  client_id: "",
  project_id: "",
  scheduled_at: "",
  duration_minutes: "30",
  platform: "",
  meeting_url: "",
  agenda: "",
};

interface MeetingsDataTableProps {
  columns: ColumnDef<Meeting, unknown>[];
  data: Meeting[];
}

export function MeetingsDataTable({ columns, data: initialData }: MeetingsDataTableProps) {
  const [meetings, setMeetings] = useState<Meeting[]>(initialData);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [clients, setClients] = useState<Client[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then((p) => setClients(p?.clients ?? [])).catch(() => {});
    fetch("/api/projects").then((r) => r.json()).then((p) => setProjectOptions(p?.projects ?? [])).catch(() => {});
  }, []);

  async function handleSchedule() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
          project_id: form.project_id || undefined,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) { setError(payload?.error ?? "Failed to schedule meeting"); return; }
      setMeetings((prev) => [...prev, payload.meeting as Meeting].sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      ));
      setForm(EMPTY_FORM);
      setShowScheduleModal(false);
    });
  }

  async function handleStatusChange(id: string, status: string) {
    startTransition(async () => {
      const res = await fetch("/api/meetings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.meeting) {
        setMeetings((prev) => prev.map((m) => (m.id === id ? payload.meeting as Meeting : m)));
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this meeting?")) return;
    startTransition(async () => {
      const res = await fetch("/api/meetings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setMeetings((prev) => prev.filter((m) => m.id !== id));
    });
  }

  // Inject live action handlers into the actions column
  const actionColumn: ColumnDef<Meeting, unknown> = {
    id: "actions",
    cell: ({ row }) => {
      const meeting = row.original as Meeting;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 text-[#737373] hover:text-[#F5F5F5] hover:bg-[#171717]">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#111111] border-[#262626] text-[#F5F5F5]">
            {meeting.status !== "Completed" && (
              <DropdownMenuItem onClick={() => handleStatusChange(meeting.id, "Completed")} className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]">
                Mark Completed
              </DropdownMenuItem>
            )}
            {meeting.status === "Scheduled" && (
              <DropdownMenuItem onClick={() => handleStatusChange(meeting.id, "Cancelled")} className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]">
                Cancel Meeting
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-[#262626]" />
            <DropdownMenuItem onClick={() => handleDelete(meeting.id)} className="cursor-pointer text-[#ef4444] focus:text-[#ef4444] hover:bg-[#ef4444]/10 focus:bg-[#ef4444]/10">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  };

  const allColumns = [...columns.filter((c) => c.id !== "actions"), actionColumn];

  const table = useReactTable({
    data: meetings,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnFilters, columnVisibility },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#F5F5F5]">Meetings & Calendar</h2>
          <p className="text-sm text-[#737373]">Manage your scheduled calls and meeting notes.</p>
        </div>
        <Button onClick={() => { setShowScheduleModal(true); setError(null); }} className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A] font-medium">
          <Plus className="h-4 w-4 mr-1" /> Schedule Meeting
        </Button>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="rounded-xl border border-[#262626] bg-[#111111] p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#F5F5F5]">New Meeting</h3>
          {error && <p className="text-xs text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded px-3 py-2">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-[#737373] mb-1 block">Meeting Title *</label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Discovery Call" className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9" />
            </div>
            <div>
              <label className="text-xs text-[#737373] mb-1 block">Client *</label>
              <select value={form.client_id} onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))} className="w-full h-9 rounded-md border border-[#262626] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5] outline-none">
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#737373] mb-1 block">Project (optional)</label>
              <select value={form.project_id} onChange={(e) => setForm((p) => ({ ...p, project_id: e.target.value }))} className="w-full h-9 rounded-md border border-[#262626] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5] outline-none">
                <option value="">None</option>
                {projectOptions.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#737373] mb-1 block">Date & Time *</label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))} className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] h-9" />
            </div>
            <div>
              <label className="text-xs text-[#737373] mb-1 block">Duration (min)</label>
              <Input type="number" value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: e.target.value }))} placeholder="30" className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9" />
            </div>
            <div>
              <label className="text-xs text-[#737373] mb-1 block">Platform</label>
              <select value={form.platform} onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))} className="w-full h-9 rounded-md border border-[#262626] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5] outline-none">
                <option value="">Select…</option>
                {["Zoom", "Google Meet", "Microsoft Teams", "Phone", "In Person"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#737373] mb-1 block">Meeting URL</label>
              <Input value={form.meeting_url} onChange={(e) => setForm((p) => ({ ...p, meeting_url: e.target.value }))} placeholder="https://zoom.us/j/…" className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9" />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setShowScheduleModal(false)} className="text-[#A3A3A3]">Cancel</Button>
            <Button size="sm" disabled={isPending} onClick={handleSchedule} className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A]">
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Schedule
            </Button>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="flex items-center space-x-2 bg-[#111111] border border-[#262626] rounded-md px-3 py-2 w-full max-w-sm">
        <Search className="h-4 w-4 text-[#737373]" />
        <input
          placeholder="Search meetings..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(e) => table.getColumn("title")?.setFilterValue(e.target.value)}
          className="w-full bg-transparent border-0 outline-none text-sm placeholder:text-[#737373] text-[#F5F5F5]"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#262626] bg-[#111111] overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#171717] border-b border-[#262626]">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-b border-[#262626] hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="text-[#A3A3A3] font-medium h-10">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-b border-[#262626] hover:bg-[#171717]/50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={allColumns.length} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <CalendarClock className="h-8 w-8 text-[#404040]" />
                    <p className="text-[#737373] text-sm">No meetings scheduled yet.</p>
                    <Button size="sm" onClick={() => setShowScheduleModal(true)} className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A]">
                      <Plus className="h-4 w-4 mr-1" /> Schedule a meeting
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <span className="flex-1 text-sm text-[#737373]">
          {table.getFilteredRowModel().rows.length} meeting{table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
        </span>
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="bg-[#111111] border-[#262626] hover:bg-[#171717] hover:text-[#F5F5F5] disabled:opacity-50">Previous</Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="bg-[#111111] border-[#262626] hover:bg-[#171717] hover:text-[#F5F5F5] disabled:opacity-50">Next</Button>
      </div>
    </div>
  );
}
