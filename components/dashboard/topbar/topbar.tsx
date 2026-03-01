"use client";

import Link from "next/link";
import { Search, Plus, CheckCircle, Settings, User, Plug, Menu } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DashboardBreadcrumb } from "@/components/dashboard/topbar/breadcrumb";
import { CommandPalette } from "../command/command-palette";
import { TasksPanel } from "@/components/dashboard/topbar/tasks-panel";
import { NotificationsPanel } from "@/components/dashboard/topbar/notifications-panel";
import { useSidebar } from "@/components/dashboard/sidebar/sidebar-context";
import { ThemeToggle } from "@/components/dashboard/topbar/theme-toggle";
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
  const { toggleMobile } = useSidebar();
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

  const handleTasksChanged = useCallback(() => {
    void refreshTasksCount();
    router.refresh();
  }, [refreshTasksCount, router]);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-6">
        <div className="flex items-center gap-3">
          {/* Hamburger — visible below lg */}
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-muted-foreground hover:text-foreground lg:hidden"
            onClick={toggleMobile}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <DashboardBreadcrumb />
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Search trigger — full bar on sm+, icon-only below sm */}
          <Button
            variant="outline"
            className="hidden w-64 justify-between border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground sm:flex rounded-full"
            onClick={() => setCommandOpen(true)}
          >
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span>Search...</span>
            </span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-muted-foreground hover:text-foreground sm:hidden"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Quick Create */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                <Plus className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-border text-foreground">
              <DropdownMenuLabel className="text-muted-foreground">Create New</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent" onClick={() => router.push("/dashboard/clients")}>Client</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent" onClick={() => router.push("/dashboard/projects")}>Project</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent" onClick={() => router.push("/dashboard/meetings")}>Meeting</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent" onClick={() => router.push("/dashboard/invoices")}>Invoice</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tasks */}
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-muted-foreground hover:text-foreground relative"
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

          {/* Integrations — hidden on small screens */}
          <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-foreground hidden md:inline-flex" asChild>
            <Link href="/dashboard/integrations">
              <Plug className="h-5 w-5" />
            </Link>
          </Button>

          {/* Settings — hidden on small screens */}
          <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-foreground hidden md:inline-flex" asChild>
            <Link href="/dashboard/settings">
              <Settings className="h-5 w-5" />
            </Link>
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <NotificationsPanel />

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full ml-1 sm:ml-2 bg-accent border border-border">
                <User className="h-5 w-5 text-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border text-foreground">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  {user && <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>}
                  {user && <p className="w-[200px] truncate text-xs text-muted-foreground">{user.primaryEmailAddress?.emailAddress}</p>}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent" onClick={() => router.push("/dashboard/settings")}>My Profile</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent md:hidden" onClick={() => router.push("/dashboard/integrations")}>Integrations</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent md:hidden" onClick={() => router.push("/dashboard/settings")}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
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
      <TasksPanel open={tasksOpen} onOpenChange={handleTasksOpenChange} onTasksChanged={handleTasksChanged} />
    </>
  );
}
