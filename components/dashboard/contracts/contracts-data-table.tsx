"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  FileText,
  MoreHorizontal,
  Download,
  Copy,
  ExternalLink,
  Send,
  CheckCircle2,
  Trash2,
  Mail,
} from "lucide-react";
import { Contract } from "./contracts-columns";

function buildGmailUrl(contract: Contract, shareUrl: string) {
  const subject = encodeURIComponent(contract.title);
  const body = encodeURIComponent(
    `Hi ${contract.client_name || "there"},\n\n` +
      `Please find the agreement "${contract.title}" ready for your review.\n\n` +
      `You can view and download the document using the link below:\n` +
      `${shareUrl}\n\n` +
      `If you have any questions or require changes, feel free to reply to this email.\n\n` +
      `Best regards`
  );
  const to = contract.client_email
    ? encodeURIComponent(contract.client_email)
    : "";
  return `https://mail.google.com/mail/?view=cm&fs=1${to ? `&to=${to}` : ""}&su=${subject}&body=${body}`;
}

interface ContractsDataTableProps {
  columns: ColumnDef<Contract, unknown>[];
  data: Contract[];
}

export function ContractsDataTable({
  columns,
  data: initialData,
}: ContractsDataTableProps) {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>(initialData);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ─── Actions ───────────────────────────────────────────────────
  async function handleStatusChange(
    id: string,
    status: "Draft" | "Sent" | "Signed"
  ) {
    startTransition(async () => {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setContracts((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status } : c))
        );
      }
    });
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Delete this contract? This will also remove its PDF from storage and cannot be undone."
      )
    )
      return;
    startTransition(async () => {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setContracts((prev) => prev.filter((c) => c.id !== id));
      }
    });
  }

  function handleCopyLink(contract: Contract) {
    const url = `${window.location.origin}/agreements/view/${contract.share_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(contract.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function handleSendViaEmail(contract: Contract) {
    const shareUrl = `${window.location.origin}/agreements/view/${contract.share_token}`;
    const gmailUrl = buildGmailUrl(contract, shareUrl);
    window.open(gmailUrl, "_blank");
    // Auto-update status to Sent if still Draft
    if (contract.status === "Draft") {
      handleStatusChange(contract.id, "Sent");
    }
  }

  // ─── Action Column ────────────────────────────────────────────
  const actionColumn: ColumnDef<Contract, unknown> = {
    id: "actions",
    cell: ({ row }) => {
      const contract = row.original;
      return (
        <div className="flex items-center gap-1">
          {contract.pdf_url && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(contract.pdf_url!, "_blank")}
              className="h-7 px-2 text-[#818cf8] hover:text-[#a5b4fc] hover:bg-[#818cf8]/10"
            >
              <Download className="h-3.5 w-3.5 mr-1" /> PDF
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleCopyLink(contract)}
            className="h-7 px-2 text-[#737373] hover:text-[#F5F5F5] hover:bg-[#171717]"
          >
            {copiedId === contract.id ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-[#22c55e]" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 text-[#737373] hover:text-[#F5F5F5] hover:bg-[#171717]"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-[#111111] border-[#262626] text-[#F5F5F5]"
            >
              <DropdownMenuLabel className="text-[#737373]">
                Actions
              </DropdownMenuLabel>

              {contract.share_token && (
                <DropdownMenuItem
                  onClick={() =>
                    window.open(
                      `/agreements/view/${contract.share_token}`,
                      "_blank"
                    )
                  }
                  className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]"
                >
                  <ExternalLink className="mr-2 h-4 w-4" /> View Public Link
                </DropdownMenuItem>
              )}

              {contract.share_token && (
                <DropdownMenuItem
                  onClick={() => handleSendViaEmail(contract)}
                  className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717] text-[#818cf8] focus:text-[#a5b4fc]"
                >
                  <Mail className="mr-2 h-4 w-4" /> Send via Email
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator className="bg-[#262626]" />

              <DropdownMenuLabel className="text-[#404040] text-xs">
                Change Status
              </DropdownMenuLabel>
              {contract.status !== "Sent" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange(contract.id, "Sent")}
                  className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]"
                >
                  <Send className="mr-2 h-4 w-4" /> Mark as Sent
                </DropdownMenuItem>
              )}
              {contract.status !== "Signed" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange(contract.id, "Signed")}
                  className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Signed
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator className="bg-[#262626]" />

              <DropdownMenuItem
                onClick={() => handleDelete(contract.id)}
                className="cursor-pointer text-[#ef4444] focus:text-[#ef4444] hover:bg-[#ef4444]/10 focus:bg-[#ef4444]/10"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  };

  const allColumns: ColumnDef<Contract, unknown>[] = [
    ...columns.filter((c) => c.id !== "actions"),
    actionColumn,
  ];

  const table = useReactTable({
    data: contracts,
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

  // ─── Stats ────────────────────────────────────────────────────
  const draftCount = contracts.filter((c) => c.status === "Draft").length;
  const sentCount = contracts.filter((c) => c.status === "Sent").length;
  const signedCount = contracts.filter((c) => c.status === "Signed").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#F5F5F5]">
            Contracts
          </h2>
          <p className="text-sm text-[#737373]">
            Generate, manage, and share legal agreements.
          </p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/contracts/new")}
          className="bg-[#6366f1] hover:bg-[#5558e6] text-white font-medium"
        >
          <Plus className="h-4 w-4 mr-1" /> New Agreement
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-[#262626] bg-[#111111] flex flex-col justify-between h-24">
          <span className="text-sm font-medium text-[#737373]">Drafts</span>
          <p className="text-2xl font-semibold text-[#f59e0b]">{draftCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#262626] bg-[#111111] flex flex-col justify-between h-24">
          <span className="text-sm font-medium text-[#737373]">
            Sent to Client
          </span>
          <p className="text-2xl font-semibold text-[#3b82f6]">{sentCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#262626] bg-[#111111] flex flex-col justify-between h-24">
          <span className="text-sm font-medium text-[#737373]">Signed</span>
          <p className="text-2xl font-semibold text-[#22c55e]">{signedCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2 bg-[#111111] border border-[#262626] rounded-md px-3 py-2 w-full max-w-sm">
        <Search className="h-4 w-4 text-[#737373]" />
        <input
          placeholder="Search by title or client..."
          value={
            (table.getColumn("client_name")?.getFilterValue() as string) ?? ""
          }
          onChange={(e) =>
            table.getColumn("client_name")?.setFilterValue(e.target.value)
          }
          className="w-full bg-transparent border-0 outline-none text-sm placeholder:text-[#737373] text-[#F5F5F5]"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#262626] bg-[#111111] overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#171717] border-b border-[#262626]">
            {table.getHeaderGroups().map((hg) => (
              <TableRow
                key={hg.id}
                className="border-b border-[#262626] hover:bg-transparent"
              >
                {hg.headers.map((h) => (
                  <TableHead
                    key={h.id}
                    className="text-[#A3A3A3] font-medium h-10"
                  >
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-[#262626] hover:bg-[#171717]/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={allColumns.length}
                  className="h-40 text-center"
                >
                  <div className="flex flex-col items-center gap-3">
                    <FileText className="h-8 w-8 text-[#404040]" />
                    <p className="text-[#737373] text-sm">
                      No contracts yet. Create your first agreement.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => router.push("/dashboard/contracts/new")}
                      className="bg-[#6366f1] hover:bg-[#5558e6] text-white"
                    >
                      <Plus className="h-4 w-4 mr-1" /> New Agreement
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2">
        <span className="flex-1 text-sm text-[#737373]">
          {table.getFilteredRowModel().rows.length} contract
          {table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="bg-[#111111] border-[#262626] hover:bg-[#171717] hover:text-[#F5F5F5] disabled:opacity-50"
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="bg-[#111111] border-[#262626] hover:bg-[#171717] hover:text-[#F5F5F5] disabled:opacity-50"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
