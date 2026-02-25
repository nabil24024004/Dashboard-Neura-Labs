"use client";

import { useState, useTransition } from "react";
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
import {
  Search, Plus, Loader2, FileSignature, MoreHorizontal, Download, CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { Agreement } from "./agreements-columns";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

/* ─── PDF Template ─── */
const pdfStyles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", backgroundColor: "#FFFFFF" },
  header: { marginBottom: 32, borderBottomWidth: 2, borderBottomColor: "#111111", paddingBottom: 16 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#111111", marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#737373" },
  section: { marginBottom: 20 },
  label: { fontSize: 9, color: "#737373", fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  value: { fontSize: 12, color: "#111111", marginBottom: 0 },
  body: { fontSize: 11, color: "#404040", lineHeight: 1.7, marginBottom: 16 },
  row: { flexDirection: "row", gap: 32, marginBottom: 16 },
  col: { flex: 1 },
  signBlock: { marginTop: 48, borderTopWidth: 1, borderTopColor: "#E5E5E5", paddingTop: 24 },
  signRow: { flexDirection: "row", gap: 40 },
  signCol: { flex: 1 },
  signLine: { borderBottomWidth: 1, borderBottomColor: "#111111", marginBottom: 6, height: 28 },
  signLabel: { fontSize: 9, color: "#737373" },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, fontSize: 9, color: "#A3A3A3", borderTopWidth: 1, borderTopColor: "#E5E5E5", paddingTop: 8 },
});

function AgreementPdfDoc({ agreement, clientName }: { agreement: Agreement; clientName: string }) {
  const today = format(new Date(), "MMMM d, yyyy");
  const expiryText = agreement.expiry_date ? format(new Date(agreement.expiry_date), "MMMM d, yyyy") : "Indefinite";
  const bodyText: Record<string, string> = {
    "Non-Disclosure Agreement (NDA)": `This Non-Disclosure Agreement ("Agreement") is entered into between Neura Labs and ${clientName}. Both parties agree to maintain the confidentiality of any proprietary information shared during the course of their business relationship. This agreement shall remain in effect for the duration specified and cannot be terminated without mutual written consent.`,
    "Master Service Agreement": `This Master Service Agreement ("MSA") governs the ongoing service relationship between Neura Labs and ${clientName}. It outlines the general terms under which individual Statements of Work will be executed. Both parties agree to act in good faith and comply with all applicable laws throughout the engagement.`,
    "Project Statement of Work (SOW)": `This Statement of Work ("SOW") defines the specific deliverables, timelines, and responsibilities for the project engagement between Neura Labs and ${clientName}. Scope changes must be agreed upon in writing and may be subject to additional fees.`,
    "Retainer Contract": `This Retainer Agreement ensures that ${clientName} has access to Neura Labs' services on a recurring basis. Monthly retainer fees are due in advance and grant access to the agreed scope of services as outlined in the accompanying service schedule.`,
  };
  const body = bodyText[agreement.type] ?? `This ${agreement.type} ("Agreement") is entered into between Neura Labs and ${clientName}. Both parties agree to the terms and conditions set forth in this document and commit to fulfilling their respective obligations in good faith.`;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>{agreement.type}</Text>
          <Text style={pdfStyles.subtitle}>Neura Labs · {today}</Text>
        </View>

        <View style={pdfStyles.row}>
          <View style={pdfStyles.col}>
            <Text style={pdfStyles.label}>Client</Text>
            <Text style={pdfStyles.value}>{clientName}</Text>
          </View>
          <View style={pdfStyles.col}>
            <Text style={pdfStyles.label}>Status</Text>
            <Text style={pdfStyles.value}>{agreement.status}</Text>
          </View>
        </View>

        <View style={pdfStyles.row}>
          <View style={pdfStyles.col}>
            <Text style={pdfStyles.label}>Effective Date</Text>
            <Text style={pdfStyles.value}>{today}</Text>
          </View>
          <View style={pdfStyles.col}>
            <Text style={pdfStyles.label}>Expiry Date</Text>
            <Text style={pdfStyles.value}>{expiryText}</Text>
          </View>
        </View>

        {agreement.notes && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.label}>Notes</Text>
            <Text style={pdfStyles.body}>{agreement.notes}</Text>
          </View>
        )}

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.label}>Agreement Terms</Text>
          <Text style={pdfStyles.body}>{body}</Text>
        </View>

        <View style={pdfStyles.signBlock}>
          <View style={pdfStyles.signRow}>
            <View style={pdfStyles.signCol}>
              <View style={pdfStyles.signLine} />
              <Text style={pdfStyles.label}>Authorized Signature — Neura Labs</Text>
              <Text style={pdfStyles.signLabel}>Date: {today}</Text>
            </View>
            <View style={pdfStyles.signCol}>
              <View style={pdfStyles.signLine} />
              <Text style={pdfStyles.label}>Authorized Signature — {clientName}</Text>
              <Text style={pdfStyles.signLabel}>Date: {agreement.signed_date ? format(new Date(agreement.signed_date), "MMMM d, yyyy") : today}</Text>
            </View>
          </View>
        </View>

        <Text style={pdfStyles.footer}>
          This document is legally binding upon execution by both parties. Generated by Neura Labs Dashboard.
        </Text>
      </Page>
    </Document>
  );
}

/* ─── Standalone form components ── */
const AGREEMENT_TYPES = [
  "Non-Disclosure Agreement (NDA)",
  "Master Service Agreement",
  "Project Statement of Work (SOW)",
  "Retainer Contract",
  "Custom Agreement",
];

const EMPTY_FORM = { client_id: "", type: AGREEMENT_TYPES[0], expiry_date: "", notes: "" };

function DraftForm({
  form, onChange, error, saving, clients, onSave, onCancel,
}: {
  form: typeof EMPTY_FORM;
  onChange: (k: keyof typeof EMPTY_FORM, v: string) => void;
  error: string | null; saving: boolean;
  clients: { id: string; company_name: string }[];
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
          <label className="text-xs text-[#737373] mb-1 block">Agreement Type *</label>
          <select value={form.type} onChange={(e) => onChange("type", e.target.value)} className="w-full h-9 rounded-md border border-[#262626] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5] outline-none">
            {AGREEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#737373] mb-1 block">Expiry Date (optional)</label>
          <Input type="date" value={form.expiry_date} onChange={(e) => onChange("expiry_date", e.target.value)} className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] h-9" />
        </div>
        <div>
          <label className="text-xs text-[#737373] mb-1 block">Notes</label>
          <Input value={form.notes} onChange={(e) => onChange("notes", e.target.value)} placeholder="Optional notes" className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" disabled={saving} onClick={onCancel} className="text-[#A3A3A3]">Cancel</Button>
        <Button size="sm" disabled={saving} onClick={onSave} className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A]">
          {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />} Create Draft
        </Button>
      </div>
    </div>
  );
}

/* ─── Main component ─── */
interface AgreementsDataTableProps {
  columns: ColumnDef<Agreement, unknown>[];
  data: Agreement[];
  clients: { id: string; company_name: string }[];
}

export function AgreementsDataTable({ columns, data: initialData, clients }: AgreementsDataTableProps) {
  const [agreements, setAgreements] = useState<Agreement[]>(initialData);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showDraftForm, setShowDraftForm] = useState(false);
  const [draftForm, setDraftForm] = useState(EMPTY_FORM);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setDraftField(k: keyof typeof EMPTY_FORM, v: string) {
    setDraftForm((p) => ({ ...p, [k]: v }));
  }

  /* Create draft */
  async function handleDraft() {
    setDraftError(null);
    startTransition(async () => {
      const body: Record<string, unknown> = {
        client_id: draftForm.client_id,
        type: draftForm.type,
      };
      if (draftForm.expiry_date) body.expiry_date = draftForm.expiry_date;
      if (draftForm.notes) body.notes = draftForm.notes;

      const res = await fetch("/api/agreements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await res.json().catch(() => null);
      if (!res.ok) { setDraftError(payload?.error ?? "Failed to create"); return; }

      const agr = payload.agreement;
      const clientName = clients.find((c) => c.id === draftForm.client_id)?.company_name ?? "Unknown Client";
      setAgreements((prev) => [{ ...agr, client_name: clientName }, ...prev]);
      setDraftForm(EMPTY_FORM);
      setShowDraftForm(false);
    });
  }

  /* Sign → generate PDF → upload → PATCH */
  async function handleSign(agreement: Agreement) {
    setSigningId(agreement.id);
    try {
      const signedDate = new Date().toISOString().split("T")[0];

      // 1️⃣ Generate PDF blob
      const blob = await pdf(
        <AgreementPdfDoc agreement={{ ...agreement, signed_date: signedDate, status: "Active" }} clientName={agreement.client_name} />
      ).toBlob();

      // 2️⃣ Upload to contracts bucket
      const fd = new FormData();
      fd.append("file", new File([blob], `${agreement.type.replace(/[^a-zA-Z0-9]/g, "_")}_${agreement.id}.pdf`, { type: "application/pdf" }));
      fd.append("bucket", "contracts");

      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      const uploadPayload = await uploadRes.json().catch(() => null);
      if (!uploadRes.ok) { alert(uploadPayload?.error ?? "Upload failed"); return; }

      // 3️⃣ Save to files table so it appears in Files page too
      await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_name: `${agreement.type} — ${agreement.client_name}.pdf`,
          file_url: uploadPayload.url,
          file_type: "application/pdf",
          file_size: blob.size,
          client_id: agreement.client_id,
          description: `Signed agreement: ${agreement.type}`,
        }),
      });

      // 4️⃣ PATCH the agreement record
      const patchRes = await fetch("/api/agreements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: agreement.id, status: "Active", signed_date: signedDate, document_link: uploadPayload.url }),
      });
      const patchPayload = await patchRes.json().catch(() => null);
      if (patchRes.ok && patchPayload?.agreement) {
        setAgreements((prev) => prev.map((a) => a.id === agreement.id
          ? { ...a, status: "Active", signed_date: signedDate, document_link: uploadPayload.url }
          : a
        ));
      }
    } catch (err) {
      console.error("Sign failed:", err);
      alert("Failed to sign agreement. Please try again.");
    } finally {
      setSigningId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this agreement? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await fetch("/api/agreements", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (res.ok) setAgreements((prev) => prev.filter((a) => a.id !== id));
    });
  }

  const statusColor = (s: string) => {
    if (s === "Active") return "border-[#22c55e] text-[#22c55e] bg-[#22c55e]/10";
    if (s === "Pending Signature") return "border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10";
    return "border-[#ef4444] text-[#ef4444] bg-[#ef4444]/10";
  };

  const actionColumn: ColumnDef<Agreement, unknown> = {
    id: "actions",
    cell: ({ row }) => {
      const agr = row.original;
      const isSigning = signingId === agr.id;
      return (
        <div className="flex items-center gap-2">
          {agr.status === "Pending Signature" && (
            <Button size="sm" disabled={isSigning || !!signingId} onClick={() => handleSign(agr)}
              className="h-7 px-3 bg-[#22c55e] hover:bg-[#16a34a] text-white text-xs gap-1">
              {isSigning ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              {isSigning ? "Signing…" : "Sign"}
            </Button>
          )}
          {agr.document_link && (
            <Button size="sm" variant="ghost" onClick={() => window.open(agr.document_link!, "_blank")}
              className="h-7 px-2 text-[#818cf8] hover:text-[#a5b4fc] hover:bg-[#818cf8]/10">
              <Download className="h-3.5 w-3.5 mr-1" /> PDF
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 text-[#737373] hover:text-[#F5F5F5] hover:bg-[#171717]">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#111111] border-[#262626] text-[#F5F5F5]">
              <DropdownMenuLabel className="text-[#737373]">Actions</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#262626]" />
              <DropdownMenuItem onClick={() => handleDelete(agr.id)} className="cursor-pointer text-[#ef4444] focus:text-[#ef4444] hover:bg-[#ef4444]/10 focus:bg-[#ef4444]/10">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  };

  /* Build columns: swap static "actions" with our live one; add status badge inline */
  const allColumns: ColumnDef<Agreement, unknown>[] = [
    ...columns.filter((c) => c.id !== "actions"),
    actionColumn,
  ];

  const table = useReactTable({
    data: agreements,
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

  /* Live stats */
  const activeCount = agreements.filter((a) => a.status === "Active").length;
  const pendingCount = agreements.filter((a) => a.status === "Pending Signature").length;
  const expiringSoon = agreements.filter((a) => {
    if (!a.expiry_date) return false;
    const d = new Date(a.expiry_date);
    return d < new Date(Date.now() + 86400000 * 30) && d > new Date();
  }).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#F5F5F5]">Agreements</h2>
          <p className="text-sm text-[#737373]">Manage contracts, NDAs, and signed documents.</p>
        </div>
        <Button onClick={() => { setShowDraftForm(true); setDraftError(null); setDraftForm(EMPTY_FORM); }} className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A] font-medium">
          <Plus className="h-4 w-4 mr-1" /> Draft Agreement
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-[#262626] bg-[#111111] flex flex-col justify-between h-24">
          <span className="text-sm font-medium text-[#737373]">Active Contracts</span>
          <p className="text-2xl font-semibold text-[#22c55e]">{activeCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#262626] bg-[#111111] flex flex-col justify-between h-24">
          <span className="text-sm font-medium text-[#737373]">Awaiting Signatures</span>
          <p className="text-2xl font-semibold text-[#f59e0b]">{pendingCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#262626] bg-[#111111] flex flex-col justify-between h-24">
          <span className="text-sm font-medium text-[#737373]">Expiring Soon (30d)</span>
          <p className="text-2xl font-semibold text-[#ef4444]">{expiringSoon}</p>
        </div>
      </div>

      {/* Draft form */}
      {showDraftForm && (
        <div className="rounded-xl border border-[#262626] bg-[#111111] p-5">
          <h3 className="text-sm font-semibold text-[#F5F5F5] mb-4">New Agreement</h3>
          <DraftForm form={draftForm} onChange={setDraftField} error={draftError} saving={isPending} clients={clients} onSave={handleDraft} onCancel={() => setShowDraftForm(false)} />
        </div>
      )}

      {/* Search */}
      <div className="flex items-center space-x-2 bg-[#111111] border border-[#262626] rounded-md px-3 py-2 w-full max-w-sm">
        <Search className="h-4 w-4 text-[#737373]" />
        <input
          placeholder="Search by client or type…"
          value={(table.getColumn("client_name")?.getFilterValue() as string) ?? ""}
          onChange={(e) => table.getColumn("client_name")?.setFilterValue(e.target.value)}
          className="w-full bg-transparent border-0 outline-none text-sm placeholder:text-[#737373] text-[#F5F5F5]"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#262626] bg-[#111111] overflow-hidden">
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
                    <FileSignature className="h-8 w-8 text-[#404040]" />
                    <p className="text-[#737373] text-sm">No agreements yet.</p>
                    <Button size="sm" onClick={() => setShowDraftForm(true)} className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A]">
                      <Plus className="h-4 w-4 mr-1" /> Draft Agreement
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <span className="flex-1 text-sm text-[#737373]">{table.getFilteredRowModel().rows.length} agreement{table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}</span>
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="bg-[#111111] border-[#262626] hover:bg-[#171717] hover:text-[#F5F5F5] disabled:opacity-50">Previous</Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="bg-[#111111] border-[#262626] hover:bg-[#171717] hover:text-[#F5F5F5] disabled:opacity-50">Next</Button>
      </div>
    </div>
  );
}
