"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, ArrowUpDown, FileText, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Payment = {
  id: string;
  invoice_number: string;
  client_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string | null;
};

export const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: "invoice_number",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-[#171717] hover:text-[#F5F5F5] -ml-4"
        >
          Invoice applied to
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium cursor-pointer hover:text-[#818cf8] transition-colors flex items-center gap-2">
         <FileText className="h-4 w-4 text-[#737373]" />
         {row.getValue("invoice_number")}
      </div>
    ),
  },
  {
    accessorKey: "client_name",
    header: "Client",
    cell: ({ row }) => <div className="text-[#F5F5F5]">{row.getValue("client_name")}</div>,
  },
  {
    accessorKey: "amount",
    header: "Amount Paid",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
 
      return <div className="font-medium text-[#22c55e]">{formatted}</div>;
    },
  },
  {
    accessorKey: "payment_method",
    header: "Method",
    cell: ({ row }) => {
      const method = row.getValue("payment_method") as string;
      return (
        <Badge variant="outline" className="border-[#262626] text-[#A3A3A3] bg-[#111111] flex items-center gap-1.5 w-max">
           <CreditCard className="h-3.5 w-3.5" />
           {method}
        </Badge>
      );
    },
  },
  {
    accessorKey: "payment_date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-[#171717] hover:text-[#F5F5F5] -ml-4"
        >
          Payment Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
       const date = new Date(row.getValue("payment_date"));
       return <div className="text-[#737373]">{format(date, "MMM d, yyyy")}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const payment = row.original;

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
            <DropdownMenuItem className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]">
              Send Receipt
            </DropdownMenuItem>
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
