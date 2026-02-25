"use client";

import { useState, useTransition } from "react";
import { Client, columns } from "./columns";
import { DataTable } from "./data-table";
import {
  X, Mail, Phone, MapPin, Building2, Calendar,
  Edit, Trash2, Plus, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

/* ─────────────────────────────────────────────────────────────────────────────
   ClientForm — MUST live OUTSIDE ClientsSplitView so React doesn't unmount
   it on every parent re-render (which would kill the focused input each keystroke).
───────────────────────────────────────────────────────────────────────────── */
type FormValues = {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  country: string;
  status: Client["status"];
  notes: string;
};

interface ClientFormProps {
  form: FormValues;
  onChange: (key: keyof FormValues, value: string) => void;
  error: string | null;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

function ClientForm({ form, onChange, error, saving, onSave, onCancel }: ClientFormProps) {
  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded px-3 py-2">
          {error}
        </p>
      )}
      {(
        [
          { key: "company_name", label: "Company Name *", placeholder: "Acme Corp" },
          { key: "contact_person", label: "Contact Person *", placeholder: "Jane Smith" },
          { key: "email", label: "Email", placeholder: "jane@acme.com" },
          { key: "phone", label: "Phone", placeholder: "+1 555-0100" },
          { key: "country", label: "Country", placeholder: "United States" },
          { key: "notes", label: "Notes", placeholder: "e.g. Referred by…" },
        ] as { key: keyof FormValues; label: string; placeholder: string }[]
      ).map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="text-xs text-[#737373] mb-1 block">{label}</label>
          <Input
            value={form[key] as string}
            onChange={(e) => onChange(key, e.target.value)}
            placeholder={placeholder}
            className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9"
          />
        </div>
      ))}
      <div>
        <label className="text-xs text-[#737373] mb-1 block">Status</label>
        <select
          value={form.status}
          onChange={(e) => onChange("status", e.target.value)}
          className="w-full h-9 rounded-md border border-[#262626] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5] outline-none focus:border-[#404040]"
        >
          <option value="Lead">Lead</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button size="sm" variant="ghost" disabled={saving} onClick={onCancel} className="text-[#A3A3A3] hover:text-[#F5F5F5]">
          Cancel
        </Button>
        <Button size="sm" disabled={saving} onClick={onSave} className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A]">
          {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────────────────────── */
interface ClientsSplitViewProps {
  initialData: Client[];
}

const EMPTY_FORM: FormValues = {
  company_name: "",
  contact_person: "",
  email: "",
  phone: "",
  country: "",
  status: "Lead",
  notes: "",
};

export function ClientsSplitView({ initialData }: ClientsSplitViewProps) {
  const [clients, setClients] = useState<Client[]>(initialData);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setField(key: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const columnsWithSelection = [
    ...columns.filter((c) => c.id !== "actions"),
    {
      id: "view",
      cell: ({ row }: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setSelectedClient(row.original); setEditMode(false); }}
          className="text-[#6366f1] hover:text-[#818cf8] hover:bg-[#6366f1]/10"
        >
          View Details
        </Button>
      ),
    },
  ];

  function openAdd() {
    setForm(EMPTY_FORM);
    setError(null);
    setShowAddModal(true);
  }

  function openEdit(client: Client) {
    setForm({
      company_name: client.company_name,
      contact_person: client.contact_person,
      email: client.email ?? "",
      phone: client.phone ?? "",
      country: client.country ?? "",
      status: client.status,
      notes: (client as any).notes ?? "",
    });
    setError(null);
    setEditMode(true);
  }

  async function handleAdd() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) { setError(payload?.error ?? "Failed to add client"); return; }
      setClients((prev) => [payload.client, ...prev]);
      setShowAddModal(false);
    });
  }

  async function handleEdit() {
    if (!selectedClient) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedClient.id, ...form }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) { setError(payload?.error ?? "Failed to update"); return; }
      const updated = payload.client as Client;
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSelectedClient(updated);
      setEditMode(false);
    });
  }

  async function handleDelete(client: Client) {
    if (!confirm(`Archive "${client.company_name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await fetch("/api/clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: client.id }),
      });
      if (res.ok) {
        setClients((prev) => prev.filter((c) => c.id !== client.id));
        setSelectedClient(null);
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6">
      {/* Table Side */}
      <div className={`flex-1 overflow-hidden flex flex-col transition-all duration-300 ${selectedClient ? "hidden lg:flex" : "flex"}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[#F5F5F5]">Clients Directory</h2>
            <p className="text-sm text-[#737373]">Manage your agency's clients and leads.</p>
          </div>
          <Button onClick={openAdd} className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A] font-medium">
            <Plus className="h-4 w-4 mr-1" /> Add Client
          </Button>
        </div>

        {/* Add form */}
        {showAddModal && (
          <div className="mb-4 min-h-[460px] rounded-xl border border-[#262626] bg-[#111111] p-5 overflow-y-auto max-h-[calc(100vh-140px)]">
            <h3 className="text-sm font-semibold text-[#F5F5F5] mb-4">New Client</h3>
            <ClientForm
              form={form}
              onChange={setField}
              error={error}
              saving={isPending}
              onSave={handleAdd}
              onCancel={() => setShowAddModal(false)}
            />
          </div>
        )}

        <ScrollArea className="flex-1 pr-4">
          {clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Building2 className="h-10 w-10 text-[#404040] mb-4" />
              <p className="text-[#F5F5F5] font-medium mb-1">No clients yet</p>
              <p className="text-sm text-[#737373] mb-4">Add your first client to get started.</p>
              <Button onClick={openAdd} size="sm" className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A]">
                <Plus className="h-4 w-4 mr-1" /> Add Client
              </Button>
            </div>
          ) : (
            <DataTable columns={columnsWithSelection} data={clients} />
          )}
        </ScrollArea>
      </div>

      {/* Detail Panel */}
      {selectedClient && (
        <div className="w-full lg:w-[450px] shrink-0 border border-[#262626] bg-[#111111] rounded-xl flex flex-col shadow-xl animate-in slide-in-from-right-4 duration-300">
          <div className="p-4 border-b border-[#262626] flex items-center justify-between bg-[#171717] rounded-t-xl">
            <h3 className="font-semibold text-[#F5F5F5] flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#737373]" /> Client Profile
            </h3>
            <div className="flex items-center gap-1">
              {!editMode && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-[#737373] hover:text-[#F5F5F5]" onClick={() => openEdit(selectedClient)}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" disabled={isPending} onClick={() => handleDelete(selectedClient)} className="h-8 w-8 text-[#ef4444] hover:bg-[#ef4444]/10">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-4 bg-[#262626] mx-1" />
              <Button variant="ghost" size="icon" onClick={() => { setSelectedClient(null); setEditMode(false); }} className="h-8 w-8 text-[#737373] hover:text-[#F5F5F5]">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {editMode ? (
                <>
                  <h3 className="text-sm font-semibold text-[#F5F5F5]">Edit Client</h3>
                  <ClientForm
                    form={form}
                    onChange={setField}
                    error={error}
                    saving={isPending}
                    onSave={handleEdit}
                    onCancel={() => setEditMode(false)}
                  />
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-2xl font-bold text-[#F5F5F5] mb-2">{selectedClient.company_name}</h2>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={
                        selectedClient.status === "Active" ? "border-[#22c55e] text-[#22c55e] bg-[#22c55e]/10"
                        : selectedClient.status === "Lead" ? "border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10"
                        : "border-[#737373] text-[#737373] bg-[#171717]"
                      }>
                        {selectedClient.status}
                      </Badge>
                      <span className="text-sm text-[#737373] flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Added {format(new Date(selectedClient.created_at), "MMM yyyy")}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold tracking-wider text-[#737373] uppercase">Contact Information</h4>
                    <div className="space-y-3 bg-[#0A0A0A] p-4 rounded-lg border border-[#262626]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#171717] border border-[#262626]">
                          <span className="text-xs font-medium text-[#F5F5F5]">{selectedClient.contact_person.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#F5F5F5]">{selectedClient.contact_person}</p>
                          <p className="text-xs text-[#737373]">Primary Contact</p>
                        </div>
                      </div>
                      <Separator className="bg-[#262626]" />
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="h-4 w-4 text-[#737373]" />
                        <span className="text-[#F5F5F5] truncate">{selectedClient.email || "No email"}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 text-[#737373]" />
                        <span className="text-[#F5F5F5]">{selectedClient.phone || "No phone"}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <MapPin className="h-4 w-4 text-[#737373]" />
                        <span className="text-[#F5F5F5]">{selectedClient.country || "No location"}</span>
                      </div>
                    </div>
                  </div>

                  {(selectedClient as any).notes && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold tracking-wider text-[#737373] uppercase">Notes</h4>
                      <p className="text-sm text-[#A3A3A3] bg-[#0A0A0A] p-4 rounded-lg border border-[#262626] leading-relaxed">
                        {(selectedClient as any).notes}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
