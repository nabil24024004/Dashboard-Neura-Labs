"use client";

import { useRef, useState, useTransition } from "react";
import {
  File, Image as ImageIcon, FileText, FileCode, Download,
  Trash2, MoreHorizontal, Upload, Plus, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type FileRecord = {
  id: string;
  project_id?: string | null;
  client_id?: string | null;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by?: string | null;
  description?: string | null;
  created_at: string;
  /* Joined */
  clients?: { company_name: string } | null;
  projects?: { project_name: string } | null;
};

interface FileGridProps {
  files: FileRecord[];
  clients: { id: string; company_name: string }[];
}

/* ── standalone form (prevent remount / focus loss) ── */
interface UploadFormProps {
  clientId: string;
  description: string;
  onChange: (k: "clientId" | "description", v: string) => void;
  clients: { id: string; company_name: string }[];
  error: string | null;
  uploading: boolean;
  onUpload: () => void;
  onCancel: () => void;
}

function UploadForm({ clientId, description, onChange, clients, error, uploading, onUpload, onCancel }: UploadFormProps) {
  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded px-3 py-2">{error}</p>}
      <div>
        <label className="text-xs text-[#737373] mb-1 block">Client *</label>
        <select value={clientId} onChange={(e) => onChange("clientId", e.target.value)} className="w-full h-9 rounded-md border border-[#262626] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5] outline-none">
          <option value="">Select client…</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-[#737373] mb-1 block">Description (optional)</label>
        <Input value={description} onChange={(e) => onChange("description", e.target.value)} placeholder="What is this file?" className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9" />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" disabled={uploading} onClick={onCancel} className="text-[#A3A3A3]">Cancel</Button>
        <Button size="sm" disabled={uploading} onClick={onUpload} className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A]">
          {uploading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />} Upload
        </Button>
      </div>
    </div>
  );
}

export function FileGrid({ files: initialFiles, clients }: FileGridProps) {
  const [files, setFiles] = useState<FileRecord[]>(initialFiles);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFormChange(k: "clientId" | "description", v: string) {
    if (k === "clientId") setClientId(v);
    else setDescription(v);
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingFile(f);
    setShowForm(true);
    setError(null);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  async function handleUpload() {
    if (!pendingFile) return;
    if (!clientId) { setError("Please select a client."); return; }
    setError(null);

    startTransition(async () => {
      // 1️⃣ Upload to Supabase Storage
      const fd = new FormData();
      fd.append("file", pendingFile);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      const uploadPayload = await uploadRes.json().catch(() => null);
      if (!uploadRes.ok) { setError(uploadPayload?.error ?? "Upload failed"); return; }

      // 2️⃣ Save record to DB
      const recRes = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_name: pendingFile.name,
          file_url: uploadPayload.url,
          file_type: pendingFile.type,
          file_size: pendingFile.size,
          client_id: clientId,
          description: description || undefined,
        }),
      });
      const recPayload = await recRes.json().catch(() => null);
      if (!recRes.ok) { setError(recPayload?.error ?? "Failed to save file record"); return; }

      const client = clients.find((c) => c.id === clientId);
      setFiles((prev) => [{ ...recPayload.file, clients: client ? { company_name: client.company_name } : null }, ...prev]);
      setPendingFile(null);
      setShowForm(false);
      setClientId("");
      setDescription("");
    });
  }

  async function handleDelete(file: FileRecord) {
    if (!confirm(`Delete "${file.file_name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await fetch("/api/files", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: file.id }) });
      if (res.ok) setFiles((prev) => prev.filter((f) => f.id !== file.id));
    });
  }

  const getIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-8 w-8 text-[#818cf8]" />;
    if (type.includes("pdf")) return <FileText className="h-8 w-8 text-[#ef4444]" />;
    if (type.includes("json") || type.includes("typescript") || type.includes("javascript")) return <FileCode className="h-8 w-8 text-[#22c55e]" />;
    return <File className="h-8 w-8 text-[#737373]" />;
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "—";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const filtered = files.filter((f) =>
    !search || f.file_name.toLowerCase().includes(search.toLowerCase()) || (f.clients?.company_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#F5F5F5]">Documents & Files</h2>
          <p className="text-sm text-[#737373]">Central repository for project assets, contracts, and references.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-2 bg-[#111111] border border-[#262626] rounded-md px-3 py-2 w-full md:w-64">
            <Upload className="h-4 w-4 text-[#737373]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files…" className="w-full bg-transparent border-0 outline-none text-sm placeholder:text-[#737373] text-[#F5F5F5]" />
          </div>
          <Button onClick={() => fileInputRef.current?.click()} className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A] font-medium shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Upload File
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={onFilePicked} />
        </div>
      </div>

      {/* Upload metadata form */}
      {showForm && pendingFile && (
        <div className="rounded-xl border border-[#262626] bg-[#111111] p-5">
          <h3 className="text-sm font-semibold text-[#F5F5F5] mb-1">Upload: <span className="text-[#818cf8]">{pendingFile.name}</span> <span className="text-[#737373] text-xs font-normal">({formatSize(pendingFile.size)})</span></h3>
          <p className="text-xs text-[#737373] mb-4">Choose a client to associate this file with.</p>
          <UploadForm clientId={clientId} description={description} onChange={handleFormChange} clients={clients} error={error} uploading={isPending} onUpload={handleUpload} onCancel={() => { setShowForm(false); setPendingFile(null); }} />
        </div>
      )}

      {/* File grid */}
      {filtered.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <File className="h-10 w-10 text-[#404040] mb-4" />
          <p className="text-[#F5F5F5] font-medium mb-1">No files yet</p>
          <p className="text-sm text-[#737373] mb-4">Upload your first file to get started.</p>
          <Button onClick={() => fileInputRef.current?.click()} size="sm" className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A]">
            <Plus className="h-4 w-4 mr-1" /> Upload File
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* Upload card */}
          <div onClick={() => fileInputRef.current?.click()} className="group rounded-xl border border-dashed border-[#404040] bg-[#111111]/50 hover:bg-[#111111] hover:border-[#737373] transition-colors p-6 flex flex-col items-center justify-center gap-3 cursor-pointer min-h-[200px]">
            <div className="h-12 w-12 rounded-full bg-[#171717] flex items-center justify-center group-hover:bg-[#262626] transition-colors">
              <Upload className="h-5 w-5 text-[#A3A3A3] group-hover:text-[#F5F5F5]" />
            </div>
            <p className="text-sm font-medium text-[#F5F5F5]">Upload New File</p>
            <p className="text-xs text-[#737373] text-center">Click to browse</p>
          </div>

          {filtered.map((file) => (
            <div key={file.id} className="group rounded-xl border border-[#262626] bg-[#111111] hover:border-[#404040] transition-colors flex flex-col min-h-[200px] overflow-hidden relative">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" className="h-8 w-8 p-0 bg-[#0A0A0A]/80 hover:bg-[#171717] text-[#F5F5F5] border border-[#262626]">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#111111] border-[#262626] text-[#F5F5F5]">
                    <DropdownMenuLabel className="text-[#737373]">Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => window.open(file.file_url, "_blank")} className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]">
                      <Download className="mr-2 h-4 w-4" /> Download
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#262626]" />
                    <DropdownMenuItem onClick={() => handleDelete(file)} className="cursor-pointer text-[#ef4444] hover:bg-[#ef4444]/10 focus:bg-[#ef4444]/10">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex-1 flex items-center justify-center p-6 bg-[#171717]/30 border-b border-[#262626]">
                {getIcon(file.file_type)}
              </div>

              <div className="p-4 flex flex-col gap-1">
                <h4 className="text-sm font-medium text-[#F5F5F5] truncate" title={file.file_name}>{file.file_name}</h4>
                {file.clients?.company_name && (
                  <span className="text-xs text-[#818cf8] truncate">{file.clients.company_name}</span>
                )}
                <div className="flex items-center justify-between text-xs text-[#737373] mt-1">
                  <span>{formatSize(file.file_size)}</span>
                  <span>{format(new Date(file.created_at), "MMM d, yyyy")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[#737373]">{filtered.length} file{filtered.length !== 1 ? "s" : ""}</p>
    </div>
  );
}
