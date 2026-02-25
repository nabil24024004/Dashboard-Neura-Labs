"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, ArrowUpDown, Video, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Meeting = {
  id: string;
  project_id: string | null;
  client_id: string | null;
  title: string;
  scheduled_at: string;
  duration_minutes: number | null;
  meeting_url: string | null;
  status: "Scheduled" | "Completed" | "Cancelled";
  platform: string | null;
  agenda: string | null;
  created_at: string;
  // Joined fields from Supabase FK embed
  clients?: { company_name: string } | null;
  projects?: { project_name: string } | null;
};

export const columns: ColumnDef<Meeting>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-[#171717] hover:text-[#F5F5F5] -ml-4"
        >
          Meeting Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium cursor-pointer hover:text-[#818cf8] transition-colors line-clamp-1">
        {row.getValue("title")}
      </div>
    ),
  },
  {
    accessorKey: "scheduled_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-[#171717] hover:text-[#F5F5F5] -ml-4"
        >
          Scheduled Date/Time
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
       const date = new Date(row.getValue("scheduled_at"));
       return (
          <div className="flex flex-col">
             <span className="text-[#F5F5F5]">{format(date, "MMM d, yyyy")}</span>
             <span className="text-xs text-[#737373]">{format(date, "h:mm a")}</span>
          </div>
       );
    },
  },
  {
    accessorKey: "duration_minutes",
    header: "Duration",
    cell: ({ row }) => <div className="text-[#737373]">{row.getValue("duration_minutes")} min</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const getStatusColor = (s: string) => {
        switch (s) {
          case "Scheduled": return "border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10";
          case "Completed": return "border-[#22c55e] text-[#22c55e] bg-[#22c55e]/10";
          case "Cancelled": return "border-[#ef4444] text-[#ef4444] bg-[#ef4444]/10";
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
    accessorKey: "platform",
    header: "Platform",
    cell: ({ row }) => {
       const platform = row.getValue("platform") as string;
       if (!platform) return <div className="text-[#737373]">—</div>;
       return (
          <div className="flex items-center gap-1.5 text-sm text-[#737373]">
             <Video className="h-4 w-4" />
             {platform}
          </div>
       );
    },
  },
  {
    accessorKey: "meeting_url",
    header: "Link",
    cell: ({ row }) => {
       const url = row.getValue("meeting_url") as string;
       if (!url) return <div className="text-[#737373]">—</div>;
       return (
          <Button variant="ghost" size="sm" asChild className="h-8 text-[#6366f1] hover:text-[#818cf8] hover:bg-[#6366f1]/10">
             <a href={url} target="_blank" rel="noreferrer">
                <LinkIcon className="h-4 w-4 mr-1.5" /> Join
             </a>
          </Button>
       );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const meeting = row.original;

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
              View Notes
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]">
              Reschedule
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#262626]" />
            <DropdownMenuItem className="cursor-pointer text-[#ef4444] focus:text-[#ef4444] hover:bg-[#ef4444]/10 focus:bg-[#ef4444]/10" >
              Cancel Meeting
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
