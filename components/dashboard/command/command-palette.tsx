"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Calendar,
  Upload,
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  CreditCard,
  FileBadge,
  PieChart,
  Plug,
  Settings,
  Clock,
  DollarSign,
  CheckSquare,
  Loader2,
  FileUp,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  type: string;
  label: string;
  sublabel?: string;
  href: string;
}

const navigationItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/dashboard/clients", icon: Users },
  { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { label: "Meetings", href: "/dashboard/meetings", icon: Calendar },
  { label: "Invoices", href: "/dashboard/invoices", icon: FileText },
  { label: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { label: "Agreements", href: "/dashboard/agreements", icon: FileBadge },
  { label: "Files", href: "/dashboard/files", icon: FileUp },
  { label: "Analytics", href: "/dashboard/analytics", icon: PieChart },
  { label: "Activity Log", href: "/dashboard/activity", icon: Clock },
  { label: "Integrations", href: "/dashboard/integrations", icon: Plug },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

const quickActions = [
  { label: "New Client", href: "/dashboard/clients", icon: Users },
  { label: "New Project", href: "/dashboard/projects", icon: FolderKanban },
  { label: "Schedule Meeting", href: "/dashboard/meetings", icon: Calendar },
  { label: "Create Invoice", href: "/dashboard/invoices", icon: DollarSign },
  { label: "Upload File", href: "/dashboard/files", icon: Upload },
];

const typeIcons: Record<string, typeof Users> = {
  client: Users,
  project: FolderKanban,
  invoice: FileText,
  meeting: Calendar,
  payment: CreditCard,
  agreement: FileBadge,
  file: FileUp,
  task: CheckSquare,
};

const typeLabels: Record<string, string> = {
  client: "Client",
  project: "Project",
  invoice: "Invoice",
  meeting: "Meeting",
  payment: "Payment",
  agreement: "Agreement",
  file: "File",
  task: "Task",
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function extractClientName(row: any): string {
  if (!row.clients) return "";
  if (Array.isArray(row.clients)) return row.clients[0]?.company_name ?? "";
  return row.clients.company_name ?? "";
}

function extractInvoiceInfo(row: any): { number: string; clientName: string } {
  const inv = row.invoices;
  if (!inv) return { number: "", clientName: "" };
  if (Array.isArray(inv)) {
    const i = inv[0];
    return {
      number: i?.invoice_number ?? "",
      clientName: extractClientName(i ?? {}),
    };
  }
  return {
    number: inv.invoice_number ?? "",
    clientName: extractClientName(inv),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function fetchJSON(url: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

function matches(text: string | undefined | null, q: string): boolean {
  return typeof text === "string" && text.toLowerCase().includes(q);
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleSelect = (callback: () => void) => {
    onOpenChange(false);
    setQuery("");
    setSearchResults([]);
    callback();
  };

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    // Abort any in-flight search
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);

    try {
      const [
        clientsData,
        projectsData,
        invoicesData,
        meetingsData,
        paymentsData,
        agreementsData,
        filesData,
        tasksData,
      ] = await Promise.all([
        fetchJSON("/api/clients"),
        fetchJSON("/api/projects"),
        fetchJSON("/api/invoices"),
        fetchJSON("/api/meetings"),
        fetchJSON("/api/payments"),
        fetchJSON("/api/agreements"),
        fetchJSON("/api/files"),
        fetchJSON("/api/tasks"),
      ]);

      if (controller.signal.aborted) return;

      const q = searchQuery.toLowerCase();
      const results: SearchResult[] = [];
      const MAX_PER_TYPE = 5;
      const MAX_TOTAL = 20;

      // --- Clients ---
      const clients = (clientsData.clients ?? []) as Record<string, any>[];
      let count = 0;
      for (const c of clients) {
        if (count >= MAX_PER_TYPE || results.length >= MAX_TOTAL) break;
        if (
          matches(c.company_name, q) ||
          matches(c.contact_person, q) ||
          matches(c.email, q) ||
          matches(c.country, q)
        ) {
          results.push({
            id: c.id,
            type: "client",
            label: c.company_name || "Unnamed Client",
            sublabel: [c.contact_person, c.email].filter(Boolean).join(" · "),
            href: "/dashboard/clients",
          });
          count++;
        }
      }

      // --- Projects ---
      const projects = (projectsData.projects ?? []) as Record<string, any>[];
      count = 0;
      for (const p of projects) {
        if (count >= MAX_PER_TYPE || results.length >= MAX_TOTAL) break;
        const clientName = extractClientName(p);
        if (
          matches(p.project_name, q) ||
          matches(p.service_type, q) ||
          matches(p.status, q) ||
          matches(clientName, q)
        ) {
          results.push({
            id: p.id,
            type: "project",
            label: p.project_name || "Unnamed Project",
            sublabel: [p.service_type, clientName].filter(Boolean).join(" · "),
            href: "/dashboard/projects",
          });
          count++;
        }
      }

      // --- Invoices ---
      const invoices = (invoicesData.invoices ?? []) as Record<string, any>[];
      count = 0;
      for (const inv of invoices) {
        if (count >= MAX_PER_TYPE || results.length >= MAX_TOTAL) break;
        const clientName = extractClientName(inv);
        if (
          matches(inv.invoice_number, q) ||
          matches(inv.status, q) ||
          matches(clientName, q) ||
          matches(String(inv.amount), q)
        ) {
          results.push({
            id: inv.id,
            type: "invoice",
            label: inv.invoice_number || "Invoice",
            sublabel: [
              inv.amount ? `$${Number(inv.amount).toLocaleString()}` : null,
              inv.status,
              clientName,
            ]
              .filter(Boolean)
              .join(" · "),
            href: "/dashboard/invoices",
          });
          count++;
        }
      }

      // --- Meetings ---
      const meetings = (meetingsData.meetings ?? []) as Record<string, any>[];
      count = 0;
      for (const m of meetings) {
        if (count >= MAX_PER_TYPE || results.length >= MAX_TOTAL) break;
        const clientName = extractClientName(m);
        if (
          matches(m.title, q) ||
          matches(m.platform, q) ||
          matches(m.agenda, q) ||
          matches(clientName, q)
        ) {
          results.push({
            id: m.id,
            type: "meeting",
            label: m.title || "Meeting",
            sublabel: [m.platform, clientName].filter(Boolean).join(" · "),
            href: "/dashboard/meetings",
          });
          count++;
        }
      }

      // --- Payments ---
      const payments = (paymentsData.payments ?? []) as Record<string, any>[];
      count = 0;
      for (const pay of payments) {
        if (count >= MAX_PER_TYPE || results.length >= MAX_TOTAL) break;
        const invInfo = extractInvoiceInfo(pay);
        if (
          matches(pay.payment_method, q) ||
          matches(invInfo.number, q) ||
          matches(invInfo.clientName, q) ||
          matches(String(pay.amount), q) ||
          matches(pay.notes, q)
        ) {
          results.push({
            id: pay.id,
            type: "payment",
            label: `$${Number(pay.amount).toLocaleString()} — ${pay.payment_method || "Payment"}`,
            sublabel: [invInfo.number, invInfo.clientName].filter(Boolean).join(" · "),
            href: "/dashboard/payments",
          });
          count++;
        }
      }

      // --- Agreements ---
      const agreements = (agreementsData.agreements ?? []) as Record<string, any>[];
      count = 0;
      for (const a of agreements) {
        if (count >= MAX_PER_TYPE || results.length >= MAX_TOTAL) break;
        const clientName = extractClientName(a);
        if (
          matches(a.type, q) ||
          matches(a.status, q) ||
          matches(clientName, q) ||
          matches(a.notes, q)
        ) {
          results.push({
            id: a.id,
            type: "agreement",
            label: a.type || "Agreement",
            sublabel: [a.status, clientName].filter(Boolean).join(" · "),
            href: "/dashboard/agreements",
          });
          count++;
        }
      }

      // --- Files ---
      const files = (filesData.files ?? []) as Record<string, any>[];
      count = 0;
      for (const f of files) {
        if (count >= MAX_PER_TYPE || results.length >= MAX_TOTAL) break;
        const clientName = extractClientName(f);
        if (
          matches(f.file_name, q) ||
          matches(f.description, q) ||
          matches(f.file_type, q) ||
          matches(clientName, q)
        ) {
          results.push({
            id: f.id,
            type: "file",
            label: f.file_name || "File",
            sublabel: [f.file_type, clientName].filter(Boolean).join(" · "),
            href: "/dashboard/files",
          });
          count++;
        }
      }

      // --- Tasks ---
      const tasks = (tasksData.tasks ?? []) as Record<string, any>[];
      count = 0;
      for (const t of tasks) {
        if (count >= MAX_PER_TYPE || results.length >= MAX_TOTAL) break;
        if (
          matches(t.title, q) ||
          matches(t.description, q) ||
          matches(t.status, q) ||
          matches(t.priority, q) ||
          matches(t.assigned_to, q)
        ) {
          results.push({
            id: t.id,
            type: "task",
            label: t.title || "Task",
            sublabel: [t.priority, t.status].filter(Boolean).join(" · "),
            href: "/dashboard/projects",
          });
          count++;
        }
      }

      if (!controller.signal.aborted) {
        setSearchResults(results);
      }
    } catch {
      if (!controller.signal.aborted) {
        setSearchResults([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, open, performSearch]);

  // Group results by type for display
  const groupedResults: Record<string, SearchResult[]> = {};
  for (const r of searchResults) {
    if (!groupedResults[r.type]) groupedResults[r.type] = [];
    groupedResults[r.type].push(r);
  }

  // Filter navigation items when there's a query
  const filteredNavItems = query.length >= 2
    ? navigationItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    : navigationItems;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      <CommandInput
        placeholder="Search clients, projects, invoices, meetings..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {/* Empty state — only show when actively searching and no results */}
        {query.length >= 2 && searchResults.length === 0 && !isSearching && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}

        {/* Loading indicator */}
        {isSearching && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#737373]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching...
          </div>
        )}

        {/* Search Results — grouped by entity type */}
        {Object.entries(groupedResults).map(([type, items]) => {
          const Icon = typeIcons[type] ?? FileText;
          const heading = `${typeLabels[type] ?? type}s`;
          return (
            <CommandGroup key={type} heading={heading}>
              {items.map((result) => (
                <CommandItem
                  key={`${result.type}-${result.id}`}
                  onSelect={() => handleSelect(() => router.push(result.href))}
                >
                  <Icon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{result.label}</span>
                  {result.sublabel && (
                    <span className="ml-2 text-xs text-[#737373] truncate">{result.sublabel}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}

        {searchResults.length > 0 && <CommandSeparator />}

        {/* Quick Actions — only when no active search */}
        {query.length < 2 && (
          <>
            <CommandGroup heading="Quick Actions">
              {quickActions.map((action) => (
                <CommandItem
                  key={action.label}
                  onSelect={() => handleSelect(() => router.push(action.href))}
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  <span>{action.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Navigation — filtered when there's a query */}
        {filteredNavItems.length > 0 && (
          <CommandGroup heading="Navigation">
            {filteredNavItems.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => handleSelect(() => router.push(item.href))}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
