"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Client = {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string | null;
  country: string | null;
  status: "Active" | "Inactive" | "Lead";
  created_at: string;
  // Compute these later if needed
  total_revenue?: number;
  active_projects?: number;
};

export const columns: ColumnDef<Client>[] = [
  {
    accessorKey: "company_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-[#171717] hover:text-[#F5F5F5] -ml-4"
        >
          Company Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium cursor-pointer hover:text-[#818cf8] transition-colors">
        {row.getValue("company_name")}
      </div>
    ),
  },
  {
    accessorKey: "contact_person",
    header: "Contact Person",
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <div className="text-[#737373]">{row.getValue("email")}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge
          variant="outline"
          className={
            status === "Active"
              ? "border-[#22c55e] text-[#22c55e] bg-[#22c55e]/10"
              : status === "Lead"
              ? "border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10"
              : "border-[#737373] text-[#737373] bg-[#171717]"
          }
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "country",
    header: "Country",
    cell: ({ row }) => <div>{row.getValue("country") || "—"}</div>,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-[#171717] hover:text-[#F5F5F5] -ml-4"
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <div>{format(new Date(row.getValue("created_at")), "MMM d, yyyy")}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const client = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 text-[#737373] hover:text-[#F5F5F5] hover:bg-[#171717]">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#111111] border-[#262626] text-[#F5F5F5]">
            <DropdownMenuLabel className="text-[#737373]">Actions</DropdownMenuLabel>
            <DropdownMenuItem className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]" onClick={() => console.log("View", client.id)}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]" onClick={() => console.log("Edit", client.id)}>
              Edit Client
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#262626]" />
            <DropdownMenuItem className="cursor-pointer text-[#ef4444] focus:text-[#ef4444] hover:bg-[#ef4444]/10 focus:bg-[#ef4444]/10" onClick={() => console.log("Delete", client.id)}>
              Delete Client
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
