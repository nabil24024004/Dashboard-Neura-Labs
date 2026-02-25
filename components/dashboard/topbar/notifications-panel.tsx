"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, FileText, FolderKanban, Users, CreditCard, Calendar, FileBadge, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";

interface ActivityNotification {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: { target_name?: string } | null;
  created_at: string;
}

const entityRoutes: Record<string, string> = {
  client: "/dashboard/clients",
  project: "/dashboard/projects",
  meeting: "/dashboard/meetings",
  invoice: "/dashboard/invoices",
  payment: "/dashboard/payments",
  agreement: "/dashboard/agreements",
  file: "/dashboard/files",
  task: "/dashboard",
};

const entityIcons: Record<string, typeof Bell> = {
  client: Users,
  project: FolderKanban,
  meeting: Calendar,
  invoice: FileText,
  payment: CreditCard,
  agreement: FileBadge,
  file: FileText,
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const LAST_SEEN_KEY = "neura_notifications_last_seen";

export function NotificationsPanel() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const lastSeenRef = useRef<string | null>(null);

  const getLastSeen = useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(LAST_SEEN_KEY);
  }, []);

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem(LAST_SEEN_KEY, now);
    lastSeenRef.current = now;
    setUnreadCount(0);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;

      const data = await res.json();
      const activities = (data.notifications ?? []) as ActivityNotification[];
      setNotifications(activities);

      const lastSeen = getLastSeen();
      lastSeenRef.current = lastSeen;
      if (lastSeen) {
        const unread = activities.filter((n) => new Date(n.created_at) > new Date(lastSeen)).length;
        setUnreadCount(unread);
      } else {
        // First time - show all as unread
        setUnreadCount(activities.length);
      }
    } catch {
      // Silent fail
    }
  }, [getLastSeen]);

  useEffect(() => {
    void fetchNotifications();

    // Poll every 60 seconds
    const interval = setInterval(() => {
      void fetchNotifications();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      void fetchNotifications();
    }
  };

  const handleNotificationClick = (notification: ActivityNotification) => {
    const route = entityRoutes[notification.entity_type] || "/dashboard/activity";
    setIsOpen(false);
    router.push(route);
  };

  const isUnread = (notification: ActivityNotification): boolean => {
    if (!lastSeenRef.current) return true;
    return new Date(notification.created_at) > new Date(lastSeenRef.current);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-9 w-9 text-[#737373] hover:text-[#F5F5F5] relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#6366f1] text-[10px] leading-4 text-white text-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 bg-[#111111] border-[#262626] text-[#F5F5F5] p-0"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626]">
          <h3 className="text-sm font-medium">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-[#818cf8] hover:text-[#6366f1] transition-colors"
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
              <Bell className="h-8 w-8 text-[#262626]" />
              <p className="text-xs text-[#737373]">No notifications yet</p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => {
                const Icon = entityIcons[notification.entity_type] || Bell;
                const unread = isUnread(notification);
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#171717] transition-colors ${
                      unread ? "bg-[#171717]/50" : ""
                    }`}
                  >
                    <div className={`mt-0.5 p-1.5 rounded-md ${unread ? "bg-[#6366f1]/10" : "bg-[#171717]"}`}>
                      <Icon className={`h-3.5 w-3.5 ${unread ? "text-[#818cf8]" : "text-[#737373]"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${unread ? "text-[#F5F5F5]" : "text-[#A3A3A3]"}`}>
                        {notification.action}
                      </p>
                      {notification.details?.target_name && (
                        <p className="text-xs text-[#737373] truncate mt-0.5">
                          {notification.details.target_name}
                        </p>
                      )}
                      <p className="text-[10px] text-[#404040] mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                    {unread && (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-[#6366f1] flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="border-t border-[#262626] px-4 py-2">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/dashboard/activity");
              }}
              className="text-xs text-[#6366f1] hover:text-[#818cf8] w-full text-center"
            >
              View all activity
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
