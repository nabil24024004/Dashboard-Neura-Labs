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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, Loader2, CreditCard, MoreHorizontal } from "lucide-react";
import { Payment } from "./payments-columns";

type InvoiceOption = { id: string; invoice_number: string; client_name: string };

const today = () => new Date().toISOString().split("T")[0];

const EMPTY_FORM = {
  invoice_id: "", amount: "", payment_date: today(), payment_method: "", notes: "",
};

/* ── Standalone form component (outside to avoid remount) ── */
function RecordPaymentForm({
  form, onChange, error, saving, invoices, onSave, onCancel,
}: {
  form: typeof EMPTY_FORM;
  onChange: (k: keyof typeof EMPTY_FORM, v: string) => void;
  error: string | null; saving: boolean;
  invoices: InvoiceOption[];
  onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded px-3 py-2">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#737373] mb-1 block">Invoice *</label>
          <select value={form.invoice_id} onChange={(e) => onChange("invoice_id", e.target.value)} className="w-full h-9 rounded-md border border-[#262626] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5] outline-none">
            <option value="">Select invoice…</option>
            {invoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.invoice_number} — {inv.client_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[#737373] mb-1 block">Amount *</label>
          <Input type="number" value={form.amount} onChange={(e) => onChange("amount", e.target.value)} placeholder="0.00" className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#737373] mb-1 block">Date</label>
          <Input type="date" value={form.payment_date} onChange={(e) => onChange("payment_date", e.target.value)} className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] h-9" />
        </div>
        <div>
          <label className="text-xs text-[#737373] mb-1 block">Method</label>
          <select value={form.payment_method} onChange={(e) => onChange("payment_method", e.target.value)} className="w-full h-9 rounded-md border border-[#262626] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5] outline-none">
            <option value="">Select…</option>
            {["Bank Transfer", "Stripe / Credit Card", "PayPal", "Wire Transfer", "ACH Transfer", "Cash", "Check"].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-[#737373] mb-1 block">Notes</label>
        <Input value={form.notes} onChange={(e) => onChange("notes", e.target.value)} placeholder="e.g. Paid in full" className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9" />
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

/* ── Main component ── */
interface PaymentsDataTableProps {
  columns: ColumnDef<Payment, unknown>[];
  data: Payment[];
  totalReceived30d: number;
  outstandingBalance: number;
  avgDaysToPay: number;
}

export function PaymentsDataTable({
  columns, data: initialData,
  totalReceived30d, outstandingBalance, avgDaysToPay,
}: PaymentsDataTableProps) {
  const [payments, setPayments] = useState<Payment[]>(initialData);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOption[]>([]);
  const [received30d, setReceived30d] = useState(totalReceived30d);

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((p) => {
        const opts: InvoiceOption[] = (p?.invoices ?? []).map((inv: any) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          client_name: inv.clients?.company_name ?? "Unknown",
        }));
        setInvoiceOptions(opts);
      })
      .catch(() => {});
  }, []);

  function setField(k: keyof typeof EMPTY_FORM, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleRecord() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) { setError(payload?.error ?? "Failed to record payment"); return; }

      const inv = invoiceOptions.find((i) => i.id === form.invoice_id);
      const newPayment: Payment = {
        id: payload.payment.id,
        invoice_number: inv?.invoice_number ?? "—",
        client_name: inv?.client_name ?? "—",
        amount: Number(form.amount),
        payment_date: form.payment_date || new Date().toISOString().split("T")[0],
        payment_method: form.payment_method || "—",
        notes: form.notes || null,
      };

      setPayments((prev) => [newPayment, ...prev]);
      setReceived30d((prev) => prev + Number(form.amount));
      setForm(EMPTY_FORM);
      setShowForm(false);
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this payment record?")) return;
    startTransition(async () => {
      const res = await fetch("/api/payments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (res.ok) setPayments((prev) => prev.filter((p) => p.id !== id));
    });
  }

  const actionColumn: ColumnDef<Payment, unknown> = {
    id: "actions",
    cell: ({ row }) => {
      const pay = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 text-[#737373] hover:text-[#F5F5F5] hover:bg-[#171717]">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#111111] border-[#262626] text-[#F5F5F5]">
            <DropdownMenuLabel className="text-[#737373]">Actions</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#262626]" />
            <DropdownMenuItem onClick={() => handleDelete(pay.id)} className="cursor-pointer text-[#ef4444] focus:text-[#ef4444] hover:bg-[#ef4444]/10 focus:bg-[#ef4444]/10">
              Delete Record
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  };

  const allColumns = [...columns.filter((c) => c.id !== "actions"), actionColumn];

  const table = useReactTable({
    data: payments,
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

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#F5F5F5]">Payments</h2>
          <p className="text-sm text-[#737373]">Track received payments and cash flow across invoices.</p>
        </div>
        <Button onClick={() => { setShowForm(true); setError(null); setForm(EMPTY_FORM); }} className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A] font-medium">
          <Plus className="h-4 w-4 mr-1" /> Record Payment
        </Button>
      </div>

      {/* Real stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-[#262626] bg-[#111111] flex flex-col justify-between h-24">
          <span className="text-sm font-medium text-[#737373]">Total Received (30d)</span>
          <p className="text-2xl font-semibold text-[#22c55e]">{fmt(received30d)}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#262626] bg-[#111111] flex flex-col justify-between h-24">
          <span className="text-sm font-medium text-[#737373]">Outstanding Balance</span>
          <p className="text-2xl font-semibold text-[#f59e0b]">{fmt(outstandingBalance)}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#262626] bg-[#111111] flex flex-col justify-between h-24">
          <span className="text-sm font-medium text-[#737373]">Avg. Days to Pay</span>
          <p className="text-2xl font-semibold text-[#F5F5F5]">{avgDaysToPay > 0 ? `${avgDaysToPay} Days` : "—"}</p>
        </div>
      </div>

      {/* Record Payment form */}
      {showForm && (
        <div className="rounded-xl border border-[#262626] bg-[#111111] p-5">
          <h3 className="text-sm font-semibold text-[#F5F5F5] mb-4">New Payment</h3>
          <RecordPaymentForm form={form} onChange={setField} error={error} saving={isPending} invoices={invoiceOptions} onSave={handleRecord} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Search */}
      <div className="flex items-center space-x-2 bg-[#111111] border border-[#262626] rounded-md px-3 py-2 w-full max-w-sm">
        <Search className="h-4 w-4 text-[#737373]" />
        <input
          placeholder="Search payments..."
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
                    <CreditCard className="h-8 w-8 text-[#404040]" />
                    <p className="text-[#737373] text-sm">No payments recorded yet.</p>
                    <Button size="sm" onClick={() => setShowForm(true)} className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A]">
                      <Plus className="h-4 w-4 mr-1" /> Record Payment
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <span className="flex-1 text-sm text-[#737373]">{table.getFilteredRowModel().rows.length} payment{table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}</span>
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="bg-[#111111] border-[#262626] hover:bg-[#171717] hover:text-[#F5F5F5] disabled:opacity-50">Previous</Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="bg-[#111111] border-[#262626] hover:bg-[#171717] hover:text-[#F5F5F5] disabled:opacity-50">Next</Button>
      </div>
    </div>
  );
}
