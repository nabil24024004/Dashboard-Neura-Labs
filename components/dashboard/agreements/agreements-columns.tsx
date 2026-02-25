"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, ArrowUpDown, FileSignature, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Agreement = {
  id: string;
  client_id: string;
  client_name: string;
  type: string;
  signed_date: string | null;
  expiry_date: string | null;
  document_link: string | null;
  status: "Active" | "Expired" | "Pending Signature";
  notes?: string | null;
};

export const columns: ColumnDef<Agreement>[] = [
  {
    accessorKey: "type",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-[#171717] hover:text-[#F5F5F5] -ml-4"
        >
          Agreement Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium cursor-pointer hover:text-[#818cf8] transition-colors flex items-center gap-2">
         <FileSignature className="h-4 w-4 text-[#737373]" />
         {row.getValue("type")}
      </div>
    ),
  },
  {
    accessorKey: "client_name",
    header: "Client",
    cell: ({ row }) => <div className="text-[#F5F5F5]">{row.getValue("client_name")}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const getStatusColor = (s: string) => {
        switch (s) {
          case "Active": return "border-[#22c55e] text-[#22c55e] bg-[#22c55e]/10";
          case "Pending Signature": return "border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10";
          case "Expired": return "border-[#ef4444] text-[#ef4444] bg-[#ef4444]/10";
          default: return "border-[#737373] text-[#737373] bg-[#171717]";
        }
      };

      return (
        <Badge variant="outline" className={getStatusColor(status)}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "signed_date",
    header: "Signed Date",
    cell: ({ row }) => {
       const dateRaw = row.getValue("signed_date");
       if (!dateRaw) return <div className="text-[#737373]">—</div>;
       const date = new Date(dateRaw as string);
       return <div className="text-[#737373]">{format(date, "MMM d, yyyy")}</div>;
    },
  },
  {
    accessorKey: "expiry_date",
    header: "Expiry Date",
    cell: ({ row }) => {
       const dateRaw = row.getValue("expiry_date");
       if (!dateRaw) return <div className="text-[#737373]">Indefinite</div>;
       
       const date = new Date(dateRaw as string);
       const isExpiringSoon = date < new Date(Date.now() + 86400000 * 30) && date > new Date(); // Expiring in < 30 days
       const isExpired = date < new Date();

       return (
          <div className={`text-sm ${
             isExpired ? "text-[#ef4444] font-medium" : 
             isExpiringSoon ? "text-[#f59e0b] font-medium" : "text-[#737373]"
             }`}>
             {format(date, "MMM d, yyyy")}
             {isExpiringSoon && <span className="text-xs ml-2 uppercase">(Soon)</span>}
          </div>
       );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const agreement = row.original;

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
            <DropdownMenuItem className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]">
              View Details
            </DropdownMenuItem>
            
            {agreement.document_link ? (
               <DropdownMenuItem className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]">
                  <ExternalLink className="mr-2 h-4 w-4" /> Open Document
               </DropdownMenuItem>
            ) : (
               <DropdownMenuItem className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]" disabled>
                  <Download className="mr-2 h-4 w-4 text-[#404040]" /> Document Unavailable
               </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator className="bg-[#262626]" />
            <DropdownMenuItem className="cursor-pointer text-[#ef4444] focus:text-[#ef4444] hover:bg-[#ef4444]/10 focus:bg-[#ef4444]/10" >
              Delete Record
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
