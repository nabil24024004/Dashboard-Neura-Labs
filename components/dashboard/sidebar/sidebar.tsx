"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Calendar,
  FileText,
  CreditCard,
  FileBadge,
  PieChart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
};

type NavGroup = {
  name: string;
  items: NavItem[];
};

export function Sidebar() {
  const pathname = usePathname();

  const overviewItem: NavItem = { name: "Overview", href: "/dashboard", icon: LayoutDashboard };
  const navigationGroups: NavGroup[] = [
    {
      name: "Workspace",
      items: [
        { name: "Clients", href: "/dashboard/clients", icon: Users },
        { name: "Projects", href: "/dashboard/projects", icon: FolderKanban },
        { name: "Meetings", href: "/dashboard/meetings", icon: Calendar },
      ],
    },
    {
      name: "Finance",
      items: [
        { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
        { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
      ],
    },
    {
      name: "Documents",
      items: [
        { name: "Agreements", href: "/dashboard/agreements", icon: FileBadge },
        { name: "Files", href: "/dashboard/files", icon: FileText },
      ],
    },
    {
      name: "Reports",
      items: [{ name: "Analytics", href: "/dashboard/analytics", icon: PieChart }],
    },
  ];

  return (
    <div className="flex h-full w-[260px] flex-col border-r border-[#262626] bg-[#0A0A0A]">
      <div className="flex h-16 items-center px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg hover:opacity-90 transition-opacity">
          <Image src="/logo-small.jpg" alt="Neura Labs Logo" width={24} height={24} className="rounded-md object-cover" />
          <span>Neura Labs</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-6 px-4">
          <Link
            href={overviewItem.href}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[#111111]",
              pathname === overviewItem.href
                ? "bg-[#111111] text-[#818cf8] before:absolute before:left-0 before:h-6 before:w-1 before:rounded-r-full before:bg-[#818cf8]"
                : "text-[#737373] hover:text-[#F5F5F5]"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            {overviewItem.name}
          </Link>

          {navigationGroups.map((group) => (
            <div key={group.name} className="space-y-3">
              <h4 className="px-3 text-xs font-semibold tracking-wider text-[#404040] uppercase">
                {group.name}
              </h4>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "relative group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[#111111]",
                        isActive
                          ? "bg-[#111111] text-[#818cf8] before:absolute before:left-0 before:h-6 before:w-1 before:rounded-r-full before:bg-[#818cf8]"
                          : "text-[#737373] hover:text-[#F5F5F5]"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4 transition-colors",
                          isActive ? "text-[#818cf8]" : "group-hover:text-[#F5F5F5]"
                        )}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
