"use client";

import Link from "next/link";
import { Search, Plus, CheckCircle, Settings, User, Plug } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DashboardBreadcrumb } from "@/components/dashboard/topbar/breadcrumb";
import { CommandPalette } from "../command/command-palette";
import { TasksPanel } from "@/components/dashboard/topbar/tasks-panel";
import { NotificationsPanel } from "@/components/dashboard/topbar/notifications-panel";
import { useState, useEffect, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar() {
  const { signOut, user } = useClerk();
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [openTaskCount, setOpenTaskCount] = useState(0);

  const refreshTasksCount = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (!res.ok) {
        return;
      }

      const payload = await res.json().catch(() => null);
      const tasks = Array.isArray(payload?.tasks) ? payload.tasks : [];
      const count = tasks.filter((task: { is_completed?: boolean; status?: string }) => {
        if (typeof task.is_completed === "boolean") return !task.is_completed;
        return task.status !== "Done";
      }).length;
      setOpenTaskCount(count);
    } catch {
      // Silent fail: avoid blocking topbar if tasks endpoint is unavailable.
    }
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshTasksCount();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [refreshTasksCount]);

  const handleTasksOpenChange = (nextOpen: boolean) => {
    setTasksOpen(nextOpen);
    if (!nextOpen) {
      void refreshTasksCount();
    }
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#262626] bg-[#0A0A0A] px-6">
        <div className="flex items-center gap-4">
          <DashboardBreadcrumb />
        </div>

        <div className="flex items-center gap-2">
          {/* Search trigger */}
          <Button
            variant="outline"
            className="hidden w-64 justify-between border-[#262626] bg-[#111111] text-[#737373] hover:bg-[#171717] hover:text-[#F5F5F5] sm:flex rounded-full"
            onClick={() => setCommandOpen(true)}
          >
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span>Search...</span>
            </span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-[#262626] bg-[#0A0A0A] px-1.5 font-mono text-[10px] font-medium text-[#737373]">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          {/* Quick Create */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-9 w-9 text-[#737373] hover:text-[#F5F5F5]">
                <Plus className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-[#111111] border-[#262626] text-[#F5F5F5]">
              <DropdownMenuLabel className="text-[#737373]">Create New</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#262626]" />
              <DropdownMenuItem className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]" onClick={() => router.push("/dashboard/clients")}>Client</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]" onClick={() => router.push("/dashboard/projects")}>Project</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]" onClick={() => router.push("/dashboard/meetings")}>Meeting</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]" onClick={() => router.push("/dashboard/invoices")}>Invoice</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tasks */}
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-9 w-9 text-[#737373] hover:text-[#F5F5F5] relative"
            onClick={() => {
              void refreshTasksCount();
              setTasksOpen(true);
            }}
          >
            <CheckCircle className="h-5 w-5" />
            {openTaskCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#ef4444] text-[10px] leading-4 text-white text-center">
                {openTaskCount > 9 ? "9+" : openTaskCount}
              </span>
            ) : null}
          </Button>

          {/* Integrations */}
          <Button size="icon" variant="ghost" className="h-9 w-9 text-[#737373] hover:text-[#F5F5F5]" asChild>
            <Link href="/dashboard/integrations">
              <Plug className="h-5 w-5" />
            </Link>
          </Button>

          {/* Settings */}
          <Button size="icon" variant="ghost" className="h-9 w-9 text-[#737373] hover:text-[#F5F5F5]" asChild>
            <Link href="/dashboard/settings">
              <Settings className="h-5 w-5" />
            </Link>
          </Button>

          {/* Notifications */}
          <NotificationsPanel />

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full ml-2 bg-[#171717] border border-[#262626]">
                <User className="h-5 w-5 text-[#F5F5F5]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#111111] border-[#262626] text-[#F5F5F5]">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  {user && <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>}
                  {user && <p className="w-[200px] truncate text-xs text-[#737373]">{user.primaryEmailAddress?.emailAddress}</p>}
                </div>
              </div>
              <DropdownMenuSeparator className="bg-[#262626]" />
              <DropdownMenuItem className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]" onClick={() => router.push("/dashboard/settings")}>My Profile</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#262626]" />
              <DropdownMenuItem 
                className="cursor-pointer text-[#ef4444] focus:text-[#ef4444] hover:bg-[#ef4444]/10 focus:bg-[#ef4444]/10"
                onClick={() => signOut({ redirectUrl: '/login' })}
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <TasksPanel open={tasksOpen} onOpenChange={handleTasksOpenChange} onTasksChanged={refreshTasksCount} />
    </>
  );
}
