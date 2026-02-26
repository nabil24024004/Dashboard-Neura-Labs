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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, Loader2, FileText, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { Invoice } from "./invoices-columns";

/* ─── helpers ─── */
type Client = { id: string; company_name: string };
type ProjectOption = { id: string; project_name: string };

const today = () => new Date().toISOString().split("T")[0];
const in30 = () => new Date(Date.now() + 86400000 * 30).toISOString().split("T")[0];

const EMPTY_INV = {
  client_id: "", project_id: "", invoice_number: "", amount: "",
  currency: "USD", issue_date: today(), due_date: in30(),
  status: "Draft" as Invoice["status"], notes: "", tax_percent: "",
};

const EMPTY_PAY = {
  amount: "", payment_date: today(), payment_method: "", notes: "",
};

/* ─── standalone form components (outside to avoid remount) ─── */
function InvoiceForm({
  form, onChange, error, saving, clients, projects, onSave, onCancel,
}: {
  form: typeof EMPTY_INV;
  onChange: (k: keyof typeof EMPTY_INV, v: string) => void;
  error: string | null; saving: boolean;
  clients: Client[]; projects: ProjectOption[];
  onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded px-3 py-2">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#737373] mb-1 block">Client *</label>
          <select value={form.client_id} onChange={(e) => onChange("client_id", e.target.value)} className="w-full h-9 rounded-md border border-[#262626] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5] outline-none">
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[#737373] mb-1 block">Project (optional)</label>
          <select value={form.project_id} onChange={(e) => onChange("project_id", e.target.value)} className="w-full h-9 rounded-md border border-[#262626] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5] outline-none">
            <option value="">None</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#737373] mb-1 block">Invoice # (auto if blank)</label>
          <Input value={form.invoice_number} onChange={(e) => onChange("invoice_number", e.target.value)} placeholder="INV-2025-0001" className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9" />
        </div>
        <div>
          <label className="text-xs text-[#737373] mb-1 block">Amount (USD) *</label>
          <Input type="number" value={form.amount} onChange={(e) => onChange("amount", e.target.value)} placeholder="0.00" className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-[#737373] mb-1 block">Issue Date *</label>
          <Input type="date" value={form.issue_date} onChange={(e) => onChange("issue_date", e.target.value)} className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] h-9" />
        </div>
        <div>
          <label className="text-xs text-[#737373] mb-1 block">Due Date *</label>
          <Input type="date" value={form.due_date} onChange={(e) => onChange("due_date", e.target.value)} className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] h-9" />
        </div>
        <div>
          <label className="text-xs text-[#737373] mb-1 block">Tax %</label>
          <Input type="number" value={form.tax_percent} onChange={(e) => onChange("tax_percent", e.target.value)} placeholder="0" className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#737373] mb-1 block">Status</label>
          <select value={form.status} onChange={(e) => onChange("status", e.target.value as Invoice["status"])} className="w-full h-9 rounded-md border border-[#262626] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5] outline-none">
            {["Draft", "Pending", "Paid", "Overdue", "Partial"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[#737373] mb-1 block">Notes</label>
          <Input value={form.notes} onChange={(e) => onChange("notes", e.target.value)} placeholder="Optional notes" className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button size="sm" variant="ghost" disabled={saving} onClick={onCancel} className="text-[#A3A3A3]">Cancel</Button>
        <Button size="sm" disabled={saving} onClick={onSave} className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A]">
          {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />} Create Invoice
        </Button>
      </div>
    </div>
  );
}

function PaymentForm({
  form, onChange, error, saving, onSave, onCancel,
}: {
  form: typeof EMPTY_PAY;
  onChange: (k: keyof typeof EMPTY_PAY, v: string) => void;
  error: string | null; saving: boolean; onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded px-3 py-2">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#737373] mb-1 block">Amount *</label>
          <Input type="number" value={form.amount} onChange={(e) => onChange("amount", e.target.value)} placeholder="0.00" className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9" />
        </div>
        <div>
          <label className="text-xs text-[#737373] mb-1 block">Payment Date</label>
          <Input type="date" value={form.payment_date} onChange={(e) => onChange("payment_date", e.target.value)} className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] h-9" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#737373] mb-1 block">Method</label>
          <select value={form.payment_method} onChange={(e) => onChange("payment_method", e.target.value)} className="w-full h-9 rounded-md border border-[#262626] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5] outline-none">
            <option value="">Select…</option>
            {["Bank Transfer", "Stripe / Credit Card", "PayPal", "Wire Transfer", "ACH Transfer", "Cash", "Check"].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[#737373] mb-1 block">Notes</label>
          <Input value={form.notes} onChange={(e) => onChange("notes", e.target.value)} placeholder="Optional" className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" disabled={saving} onClick={onCancel} className="text-[#A3A3A3]">Cancel</Button>
        <Button size="sm" disabled={saving} onClick={onSave} className="bg-[#22c55e] hover:bg-[#16a34a] text-white">
          {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />} Record Payment
        </Button>
      </div>
    </div>
  );
}

/* ─── Main component ─── */
interface InvoicesDataTableProps {
  columns: ColumnDef<Invoice, unknown>[];
  data: Invoice[];
}

export function InvoicesDataTable({ columns, data: initialData }: InvoicesDataTableProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialData);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [invForm, setInvForm] = useState(EMPTY_INV);
  const [payForm, setPayForm] = useState(EMPTY_PAY);
  const [invError, setInvError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then((p) => setClients(p?.clients ?? [])).catch(() => {});
    fetch("/api/projects").then((r) => r.json()).then((p) => setProjects(p?.projects ?? [])).catch(() => {});
  }, []);

  function setInvField(k: keyof typeof EMPTY_INV, v: string) { setInvForm((p) => ({ ...p, [k]: v })); }
  function setPayField(k: keyof typeof EMPTY_PAY, v: string) { setPayForm((p) => ({ ...p, [k]: v })); }

  async function handleCreate() {
    setInvError(null);
    startTransition(async () => {
      const body: Record<string, unknown> = { ...invForm };
      if (!invForm.project_id) delete body.project_id;
      if (!invForm.invoice_number) delete body.invoice_number;
      if (!invForm.tax_percent) delete body.tax_percent;
      if (!invForm.notes) delete body.notes;
      if (invForm.amount) body.amount = Number(invForm.amount);
      if (invForm.tax_percent) body.tax_percent = Number(invForm.tax_percent);

      const res = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await res.json().catch(() => null);
      if (!res.ok) { setInvError(payload?.error ?? "Failed to create invoice"); return; }
      const inv = payload.invoice;
      const clientName = clients.find((c) => c.id === inv.client_id)?.company_name ?? "Unknown";
      setInvoices((prev) => [{ ...inv, client_name: clientName }, ...prev]);
      setInvForm(EMPTY_INV);
      setShowCreateForm(false);
    });
  }

  async function handleRecordPayment() {
    if (!payingInvoice) return;
    setPayError(null);
    startTransition(async () => {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payForm, invoice_id: payingInvoice.id, amount: Number(payForm.amount) }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) { setPayError(payload?.error ?? "Failed to record payment"); return; }
      // Refresh invoice status optimistically
      const paidAmt = Number(payForm.amount);
      const newStatus: Invoice["status"] = paidAmt >= payingInvoice.amount ? "Paid" : "Partial";
      setInvoices((prev) => prev.map((inv) => inv.id === payingInvoice.id ? { ...inv, status: newStatus } : inv));
      setPayForm(EMPTY_PAY);
      setPayingInvoice(null);
    });
  }

  async function handleStatusChange(id: string, status: Invoice["status"]) {
    startTransition(async () => {
      const res = await fetch("/api/invoices", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.invoice) {
        setInvoices((prev) => prev.map((inv) => inv.id === id ? { ...inv, status } : inv));
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await fetch("/api/invoices", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (res.ok) setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    });
  }

  const actionColumn: ColumnDef<Invoice, unknown> = {
    id: "actions",
    cell: ({ row }) => {
      const inv = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 text-[#737373] hover:text-[#F5F5F5] hover:bg-[#171717]">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#111111] border-[#262626] text-[#F5F5F5]">
            <DropdownMenuLabel className="text-[#737373]">Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => { setPayingInvoice(inv); setPayForm(EMPTY_PAY); setPayError(null); }} className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]">
              Record Payment
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#262626]" />
            {inv.status !== "Paid" && (
              <DropdownMenuItem onClick={() => handleStatusChange(inv.id, "Paid")} className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]">
                Mark as Paid
              </DropdownMenuItem>
            )}
            {inv.status === "Draft" && (
              <DropdownMenuItem onClick={() => handleStatusChange(inv.id, "Pending")} className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]">
                Send (Mark Pending)
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-[#262626]" />
            <DropdownMenuItem onClick={() => handleDelete(inv.id)} className="cursor-pointer text-[#ef4444] focus:text-[#ef4444] hover:bg-[#ef4444]/10 focus:bg-[#ef4444]/10">
              Delete Invoice
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  };

  const allColumns = [...columns.filter((c) => c.id !== "actions"), actionColumn];

  const table = useReactTable({
    data: invoices,
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
          <h2 className="text-xl font-semibold tracking-tight text-[#F5F5F5]">Invoices</h2>
          <p className="text-sm text-[#737373]">Manage and track your billing.</p>
        </div>
        <Button onClick={() => { setShowCreateForm(true); setInvError(null); setInvForm(EMPTY_INV); }} className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A] font-medium">
          <Plus className="h-4 w-4 mr-1" /> Create Invoice
        </Button>
      </div>

      {/* Create Invoice form */}
      {showCreateForm && (
        <div className="rounded-xl border border-[#262626] bg-[#111111] p-5 overflow-y-auto max-h-[calc(100vh-160px)]">
          <h3 className="text-sm font-semibold text-[#F5F5F5] mb-4">New Invoice</h3>
          <InvoiceForm form={invForm} onChange={setInvField} error={invError} saving={isPending} clients={clients} projects={projects} onSave={handleCreate} onCancel={() => setShowCreateForm(false)} />
        </div>
      )}

      {/* Record Payment inline panel */}
      {payingInvoice && (
        <div className="rounded-xl border border-[#22c55e]/30 bg-[#111111] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#F5F5F5]">
              Record Payment — <span className="text-[#818cf8]">{payingInvoice.invoice_number}</span>
              <span className="ml-2 text-xs text-[#737373]">({new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(payingInvoice.amount)} total)</span>
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setPayingInvoice(null)} className="text-[#737373] hover:text-[#F5F5F5] h-7 px-2">✕</Button>
          </div>
          <PaymentForm form={payForm} onChange={setPayField} error={payError} saving={isPending} onSave={handleRecordPayment} onCancel={() => setPayingInvoice(null)} />
        </div>
      )}

      {/* Search */}
      <div className="flex items-center space-x-2 bg-[#111111] border border-[#262626] rounded-md px-3 py-2 w-full max-w-sm">
        <Search className="h-4 w-4 text-[#737373]" />
        <input
          placeholder="Search invoices..."
          value={(table.getColumn("invoice_number")?.getFilterValue() as string) ?? ""}
          onChange={(e) => table.getColumn("invoice_number")?.setFilterValue(e.target.value)}
          className="w-full bg-transparent border-0 outline-none text-sm placeholder:text-[#737373] text-[#F5F5F5]"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#262626] bg-[#111111] overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#171717] border-b border-[#262626]">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-b border-[#262626] hover:bg-transparent">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="text-[#A3A3A3] font-medium h-10">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
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
                    <FileText className="h-8 w-8 text-[#404040]" />
                    <p className="text-[#737373] text-sm">No invoices yet.</p>
                    <Button size="sm" onClick={() => setShowCreateForm(true)} className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A]">
                      <Plus className="h-4 w-4 mr-1" /> Create Invoice
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <span className="flex-1 text-sm text-[#737373]">{table.getFilteredRowModel().rows.length} invoice{table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}</span>
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="bg-[#111111] border-[#262626] hover:bg-[#171717] hover:text-[#F5F5F5] disabled:opacity-50">Previous</Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="bg-[#111111] border-[#262626] hover:bg-[#171717] hover:text-[#F5F5F5] disabled:opacity-50">Next</Button>
      </div>
    </div>
  );
}
