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

export type Project = {
  id: string;
  client_id: string;
  project_name: string;
  service_type: string;
  status: "Lead" | "Planning" | "In Progress" | "Review" | "Completed" | "On Hold";
  deadline: string | null;
  budget: number | null;
  progress: number;
  assigned_team: string[];
  created_at: string;
};

export const columns: ColumnDef<Project>[] = [
  {
    accessorKey: "project_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-accent hover:text-foreground -ml-4"
        >
          Project Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium cursor-pointer hover:text-primary transition-colors">
        {row.getValue("project_name")}
      </div>
    ),
  },
  {
    accessorKey: "service_type",
    header: "Service",
    cell: ({ row }) => <div className="text-muted-foreground">{row.getValue("service_type")}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const getStatusColor = (s: string) => {
        switch (s) {
          case "Completed": return "border-[#22c55e] text-[#22c55e] bg-[#22c55e]/10";
          case "In Progress": return "border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10";
          case "Review": return "border-[#a855f7] text-[#a855f7] bg-[#a855f7]/10";
          case "Planning": return "border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10";
          case "On Hold": return "border-[#ef4444] text-[#ef4444] bg-[#ef4444]/10";
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
    accessorKey: "deadline",
    header: "Deadline",
    cell: ({ row }) => {
       const raw = row.getValue("deadline");
       if (!raw) return <div className="text-muted-foreground">—</div>;
       return <div>{format(new Date(raw as string), "MMM d, yyyy")}</div>;
    },
  },
  {
    accessorKey: "progress",
    header: "Progress",
    cell: ({ row }) => {
       const pct = row.getValue("progress") as number;
       // We can use a small linear progress bar here, for now simple text
       return (
          <div className="flex items-center gap-2">
             <div className="h-1.5 w-16 bg-accent rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${pct}%` }}></div>
             </div>
             <span className="text-xs text-muted-foreground">{pct}%</span>
          </div>
       );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const project = row.original;

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
              View Project
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
              Edit Project
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-accent" />
            <DropdownMenuItem className="cursor-pointer text-[#ef4444] focus:text-[#ef4444] hover:bg-[#ef4444]/10 focus:bg-[#ef4444]/10" >
              Delete Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
