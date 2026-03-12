"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, ArrowUpDown, FileText, Download, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { InvoicePdfDownload } from "./invoice-pdf";

export type Invoice = {
  id: string;
  invoice_number: string;
  client_name: string;
  amount: number;
  currency: string;
  issue_date: string;
  due_date: string;
  status: "Draft" | "Pending" | "Paid" | "Overdue" | "Partial";
};

export const columns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "invoice_number",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-accent hover:text-foreground -ml-4"
        >
          Invoice #
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium cursor-pointer hover:text-primary transition-colors flex items-center gap-2">
         <FileText className="h-4 w-4 text-muted-foreground" />
         {row.getValue("invoice_number")}
      </div>
    ),
  },
  {
    accessorKey: "client_name",
    header: "Client",
    cell: ({ row }) => <div className="text-foreground max-w-[200px] truncate" title={row.getValue("client_name")}>{row.getValue("client_name")}</div>,
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
 
      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const getStatusColor = (s: string) => {
        switch (s) {
          case "Paid": return "border-[#22c55e] text-[#22c55e] bg-[#22c55e]/10";
          case "Pending": return "border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10";
          case "Draft": return "border-[#737373] text-muted-foreground bg-accent";
          case "Overdue": return "border-[#ef4444] text-[#ef4444] bg-[#ef4444]/10";
          case "Partial": return "border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10";
          default: return "border-[#737373] text-muted-foreground bg-accent";
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
    accessorKey: "issue_date",
    header: "Issued",
    cell: ({ row }) => {
       const date = new Date(row.getValue("issue_date"));
       return <div className="text-muted-foreground">{format(date, "MMM d, yyyy")}</div>;
    },
  },
  {
    accessorKey: "due_date",
    header: "Due Date",
    cell: ({ row }) => {
       const date = new Date(row.getValue("due_date"));
       const isOverdue = row.original.status === "Overdue";
       return (
          <div className={`text-sm ${isOverdue ? "text-[#ef4444] font-medium" : "text-muted-foreground"}`}>
             {format(date, "MMM d, yyyy")}
          </div>
       );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const invoice = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border text-foreground">
            <DropdownMenuLabel className="text-muted-foreground">Actions</DropdownMenuLabel>
            <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
              <Mail className="h-4 w-4 mr-2" /> Send via Email
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent p-0" asChild>
              <div className="px-2 py-1.5 hover:bg-accent">
                <InvoicePdfDownload invoice={invoice} />
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-accent" />
            <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
              Record Payment
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-[#ef4444] focus:text-[#ef4444] hover:bg-[#ef4444]/10 focus:bg-[#ef4444]/10" >
              Delete Invoice
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
