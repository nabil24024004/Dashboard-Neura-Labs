"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpDown,
  FileText,
} from "lucide-react";

export type Contract = {
  id: string;
  contract_type: string;
  title: string;
  client_name: string;
  client_email: string | null;
  field_values: Record<string, unknown>;
  pdf_url: string | null;
  share_token: string;
  status: "Draft" | "Sent" | "Signed" | "Archived";
  created_by: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
};

function statusColor(s: string) {
  switch (s) {
    case "Signed":
      return "border-[#22c55e] text-[#22c55e] bg-[#22c55e]/10";
    case "Sent":
      return "border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10";
    case "Draft":
      return "border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10";
    case "Archived":
      return "border-[#737373] text-[#737373] bg-[#737373]/10";
    default:
      return "border-[#737373] text-[#737373] bg-[#171717]";
  }
}

function typeLabel(type: string) {
  switch (type) {
    case "NDA":
      return "NDA";
    case "MSA":
      return "MSA";
    case "SOW":
      return "SOW";
    case "RETAINER":
      return "Retainer";
    default:
      return type;
  }
}

export const columns: ColumnDef<Contract>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="hover:bg-[#171717] hover:text-[#F5F5F5] -ml-4"
      >
        Contract
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-medium text-[#F5F5F5] max-w-[280px]">
        <FileText className="h-4 w-4 text-[#737373] shrink-0" />
        <span className="truncate">{row.getValue("title")}</span>
      </div>
    ),
  },
  {
    accessorKey: "contract_type",
    header: "Type",
    cell: ({ row }) => (
      <span className="px-2 py-0.5 rounded-md bg-[#818cf8]/10 text-[#818cf8] text-xs font-medium border border-[#818cf8]/20">
        {typeLabel(row.getValue("contract_type"))}
      </span>
    ),
  },
  {
    accessorKey: "client_name",
    header: "Client",
    cell: ({ row }) => (
      <div className="text-[#F5F5F5]">
        {row.getValue("client_name") || "—"}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant="outline" className={statusColor(status)}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="hover:bg-[#171717] hover:text-[#F5F5F5] -ml-4"
      >
        Created
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const dateRaw = row.getValue("created_at") as string;
      if (!dateRaw) return <div className="text-[#737373]">—</div>;
      return (
        <div className="text-[#737373]">
          {format(new Date(dateRaw), "MMM d, yyyy")}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: () => null, // Overridden in the data table component
  },
];
