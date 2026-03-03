"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
    ArrowLeft,
    Calendar,
    Clock,
    Plus,
    Play,
    Eye,
    CheckCircle2,
    RotateCcw,
    ChevronDown,
    ChevronRight,
    Trash2,
    Star,
    Users,
    AlertCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface UserRef {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
}

interface Assignment {
    id: string;
    work_item_id: string;
    member_id: string;
    role_on_item: string;
    users: UserRef;
}

interface WorkItem {
    id: string;
    title: string;
    description: string | null;
    category: string;
    status: string;
    estimated_hours: number | null;
    actual_hours: number | null;
    due_date: string | null;
    sort_order: number;
    created_at: string;
    assignments: Assignment[];
}

interface CategoryProgress {
    category: string;
    total: number;
    done: number;
    progress: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    not_started: { label: "Not Started", color: "border-[#737373] text-muted-foreground bg-accent" },
    in_progress: { label: "In Progress", color: "border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10" },
    in_review: { label: "In Review", color: "border-[#a855f7] text-[#a855f7] bg-[#a855f7]/10" },
    done: { label: "Completed", color: "border-[#22c55e] text-[#22c55e] bg-[#22c55e]/10" },
};

const ACTION_BUTTONS: Record<string, { label: string; icon: React.ElementType; nextStatus: string }> = {
    not_started: { label: "Start Work", icon: Play, nextStatus: "in_progress" },
    in_progress: { label: "Submit for Review", icon: Eye, nextStatus: "in_review" },
    in_review: { label: "Approve", icon: CheckCircle2, nextStatus: "done" },
    done: { label: "Reopen", icon: RotateCcw, nextStatus: "in_progress" },
};

function getProjectStatusColor(status: string) {
    switch (status) {
        case "Completed": return "border-[#22c55e] text-[#22c55e] bg-[#22c55e]/10";
        case "In Progress": return "border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10";
        case "Review": return "border-[#a855f7] text-[#a855f7] bg-[#a855f7]/10";
        case "Planning": return "border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10";
        case "On Hold": return "border-[#ef4444] text-[#ef4444] bg-[#ef4444]/10";
        default: return "border-[#737373] text-muted-foreground bg-accent";
    }
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface Props {
    project: Record<string, unknown>;
    workItems: WorkItem[];
    categoryProgress: CategoryProgress[];
    teamMembers: UserRef[];
}

export function ProjectDetailClient({ project, workItems: initialItems, categoryProgress: initialCatProgress, teamMembers }: Props) {
    const [tab, setTab] = useState<"overview" | "work-breakdown">("work-breakdown");
    const [workItems, setWorkItems] = useState<WorkItem[]>(initialItems);
    const [catProgress, setCatProgress] = useState<CategoryProgress[]>(initialCatProgress);
    const [projectProgress, setProjectProgress] = useState(project.progress as number ?? 0);
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    // inline add state
    const [showAddForm, setShowAddForm] = useState<string | null>(null);
    const [newItemTitle, setNewItemTitle] = useState("");

    const handleStatusChange = useCallback(
        (itemId: string, newStatus: string) => {
            setError(null);
            startTransition(async () => {
                const res = await fetch("/api/work-items/status", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ work_item_id: itemId, status: newStatus }),
                });

                const data = await res.json();
                if (!res.ok) {
                    setError(data.error || "Failed to update status");
                    return;
                }

                // Update local state
                setWorkItems((prev) =>
                    prev.map((wi) =>
                        wi.id === itemId ? { ...wi, status: data.work_item.status } : wi
                    )
                );

                if (data.project_progress !== null && data.project_progress !== undefined) {
                    setProjectProgress(data.project_progress);
                }

                // Refresh category progress
                const cpRes = await fetch(`/api/work-items?project_id=${project.id}`);
                const cpData = await cpRes.json();
                if (cpData.category_progress) setCatProgress(cpData.category_progress);
            });
        },
        [project.id]
    );

    const handleAddItem = useCallback(
        (category: string) => {
            if (!newItemTitle.trim()) return;
            startTransition(async () => {
                const res = await fetch("/api/work-items", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        project_id: project.id,
                        title: newItemTitle.trim(),
                        category,
                    }),
                });

                const data = await res.json();
                if (!res.ok) {
                    setError(data.error || "Failed to create work item");
                    return;
                }

                setWorkItems((prev) => [...prev, { ...data.work_item, assignments: [] }]);
                setNewItemTitle("");
                setShowAddForm(null);

                // Refresh category progress
                const cpRes = await fetch(`/api/work-items?project_id=${project.id}`);
                const cpData = await cpRes.json();
                if (cpData.category_progress) setCatProgress(cpData.category_progress);
            });
        },
        [newItemTitle, project.id]
    );

    const handleDeleteItem = useCallback(
        (itemId: string) => {
            startTransition(async () => {
                const res = await fetch("/api/work-items", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: itemId }),
                });

                if (res.ok) {
                    setWorkItems((prev) => prev.filter((wi) => wi.id !== itemId));
                    // Refresh category progress
                    const cpRes = await fetch(`/api/work-items?project_id=${project.id}`);
                    const cpData = await cpRes.json();
                    if (cpData.category_progress) setCatProgress(cpData.category_progress);
                }
            });
        },
        [project.id]
    );

    const toggleCategory = useCallback((cat: string) => {
        setCollapsedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    }, []);

    // Group items by category
    const categories = [...new Set(workItems.map((wi) => wi.category))];
    const itemsByCategory: Record<string, WorkItem[]> = {};
    for (const cat of categories) {
        itemsByCategory[cat] = workItems.filter((wi) => wi.category === cat);
    }

    // Compute unique members from assignments
    const uniqueMembers = new Map<string, UserRef>();
    for (const wi of workItems) {
        for (const a of wi.assignments) {
            if (a.users && !uniqueMembers.has(a.member_id)) {
                uniqueMembers.set(a.member_id, a.users);
            }
        }
    }

    const totalItems = workItems.length;
    const doneItems = workItems.filter((wi) => wi.status === "done").length;
    const totalHours = workItems.reduce((sum, wi) => sum + (wi.estimated_hours || 0), 0);

    const clientData = project.clients as Record<string, unknown> | null;

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Header */}
            <div>
                <Link
                    href="/dashboard/projects"
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3"
                >
                    <ArrowLeft className="h-3 w-3" /> Back to Projects
                </Link>

                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                            {project.project_name as string}
                        </h1>
                        <div className="flex items-center gap-3 mt-1.5">
                            <Badge variant="outline" className={getProjectStatusColor(project.status as string)}>
                                {project.status as string}
                            </Badge>
                            {Boolean(clientData?.company_name) ? (
                                <span className="text-sm text-muted-foreground">{String(clientData!.company_name)}</span>
                            ) : null}
                            <span className="text-sm text-muted-foreground">{project.service_type as string}</span>
                        </div>
                    </div>

                    {/* Progress display */}
                    <div className="text-right min-w-[160px]">
                        <div className="text-3xl font-bold text-foreground">{projectProgress}%</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                            {doneItems} / {totalItems} items done
                        </div>
                        <div className="h-2 w-full bg-accent rounded-full overflow-hidden mt-2">
                            <div
                                className="h-full bg-primary transition-all duration-500"
                                style={{ width: `${projectProgress}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-border">
                <button
                    onClick={() => setTab("overview")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "overview"
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setTab("work-breakdown")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "work-breakdown"
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Work Breakdown
                    <span className="ml-1.5 text-xs text-muted-foreground">({totalItems})</span>
                </button>
            </div>

            {error && (
                <div className="flex items-start gap-2 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-2 text-sm text-red-700 dark:text-[#fca5a5]">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {error}
                </div>
            )}

            {/* Tab Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {tab === "overview" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="rounded-lg border border-border bg-card p-4">
                            <div className="text-xs text-muted-foreground mb-1">Budget</div>
                            <div className="text-lg font-semibold text-foreground">
                                {project.budget ? `$${Number(project.budget).toLocaleString()}` : "—"}
                            </div>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-4">
                            <div className="text-xs text-muted-foreground mb-1">Deadline</div>
                            <div className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {project.deadline ? format(new Date(project.deadline as string), "MMM d, yyyy") : "—"}
                            </div>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-4">
                            <div className="text-xs text-muted-foreground mb-1">Est. Hours</div>
                            <div className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                {totalHours || "—"}
                            </div>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-4">
                            <div className="text-xs text-muted-foreground mb-1">Team</div>
                            <div className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                {uniqueMembers.size} member{uniqueMembers.size !== 1 ? "s" : ""}
                            </div>
                        </div>
                        {Boolean(project.description) ? (
                            <div className="rounded-lg border border-border bg-card p-4 col-span-full">
                                <div className="text-xs text-muted-foreground mb-1">Description</div>
                                <p className="text-sm text-foreground">{String(project.description)}</p>
                            </div>
                        ) : null}

                        {/* Category progress cards */}
                        {catProgress.length > 0 && (
                            <div className="col-span-full">
                                <h3 className="text-sm font-medium text-foreground mb-3">Category Progress</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {catProgress.map((cp) => (
                                        <div key={cp.category} className="rounded-lg border border-border bg-card p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-foreground">{cp.category}</span>
                                                <span className="text-xs text-muted-foreground">{cp.done}/{cp.total}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-accent rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all duration-500"
                                                    style={{ width: `${cp.progress ?? 0}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground mt-1 block">{cp.progress ?? 0}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tab === "work-breakdown" && (
                    <div className="space-y-4">
                        {categories.length === 0 ? (
                            <div className="text-center py-16">
                                <p className="text-foreground font-medium mb-1">No work items yet</p>
                                <p className="text-sm text-muted-foreground">
                                    Work items define the deliverables of your project.
                                </p>
                            </div>
                        ) : (
                            categories.map((cat) => {
                                const items = itemsByCategory[cat];
                                const isCollapsed = collapsedCategories.has(cat);
                                const catData = catProgress.find((cp) => cp.category === cat);
                                const progressPct = catData?.progress ?? 0;

                                return (
                                    <div key={cat} className="rounded-lg border border-border bg-card overflow-hidden">
                                        <button
                                            onClick={() => toggleCategory(cat)}
                                            className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                                <span className="font-medium text-foreground">{cat}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {catData?.done ?? 0}/{catData?.total ?? items.length} done
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="h-1.5 w-24 bg-accent rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
                                                </div>
                                                <span className="text-xs text-muted-foreground w-10 text-right">{progressPct}%</span>
                                            </div>
                                        </button>

                                        {!isCollapsed && (
                                            <div className="border-t border-border divide-y divide-border">
                                                {items.map((item) => {
                                                    const action = ACTION_BUTTONS[item.status];
                                                    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.not_started;
                                                    const ActionIcon = action?.icon;

                                                    return (
                                                        <div key={item.id} className="p-4 flex items-start gap-4 group">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusCfg.color}`}>
                                                                        {statusCfg.label}
                                                                    </Badge>
                                                                    <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
                                                                </div>
                                                                {item.description && (
                                                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                                                                )}
                                                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                                    {item.estimated_hours && (
                                                                        <span className="flex items-center gap-1">
                                                                            <Clock className="h-3 w-3" />
                                                                            {item.estimated_hours} hrs
                                                                        </span>
                                                                    )}
                                                                    {item.due_date && (
                                                                        <span className="flex items-center gap-1">
                                                                            <Calendar className="h-3 w-3" />
                                                                            {format(new Date(item.due_date), "MMM d")}
                                                                        </span>
                                                                    )}
                                                                    {/* Assignment bubbles */}
                                                                    <div className="flex items-center gap-1">
                                                                        {item.assignments.map((a) => (
                                                                            <span
                                                                                key={a.id}
                                                                                className={`inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[10px] font-medium ${a.role_on_item === "lead"
                                                                                    ? "bg-[#f59e0b]/10 text-[#f59e0b]"
                                                                                    : a.role_on_item === "reviewer"
                                                                                        ? "bg-[#a855f7]/10 text-[#a855f7]"
                                                                                        : "bg-accent text-foreground"
                                                                                    }`}
                                                                                title={`${a.users?.first_name} ${a.users?.last_name} (${a.role_on_item})`}
                                                                            >
                                                                                {a.role_on_item === "lead" && <Star className="h-2 w-2" />}
                                                                                {a.users?.first_name}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Action buttons */}
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {action && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        disabled={isPending}
                                                                        onClick={() => handleStatusChange(item.id, action.nextStatus)}
                                                                        className="h-7 text-xs border-border"
                                                                    >
                                                                        {ActionIcon && <ActionIcon className="h-3 w-3 mr-1" />}
                                                                        {action.label}
                                                                    </Button>
                                                                )}
                                                                {item.status === "in_review" && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        disabled={isPending}
                                                                        onClick={() => handleStatusChange(item.id, "in_progress")}
                                                                        className="h-7 text-xs text-muted-foreground"
                                                                    >
                                                                        <RotateCcw className="h-3 w-3 mr-1" /> Send Back
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    disabled={isPending}
                                                                    onClick={() => handleDeleteItem(item.id)}
                                                                    className="h-7 w-7 text-muted-foreground hover:text-[#ef4444] opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {/* Add item inline */}
                                                <div className="p-3">
                                                    {showAddForm === cat ? (
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                value={newItemTitle}
                                                                onChange={(e) => setNewItemTitle(e.target.value)}
                                                                placeholder="Work item title"
                                                                className="h-8 text-sm bg-background border-border flex-1"
                                                                autoFocus
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter") handleAddItem(cat);
                                                                    if (e.key === "Escape") { setShowAddForm(null); setNewItemTitle(""); }
                                                                }}
                                                            />
                                                            <Button
                                                                size="sm"
                                                                disabled={isPending || !newItemTitle.trim()}
                                                                onClick={() => handleAddItem(cat)}
                                                                className="h-8 text-xs"
                                                            >
                                                                Add
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => { setShowAddForm(null); setNewItemTitle(""); }}
                                                                className="h-8 text-xs text-muted-foreground"
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setShowAddForm(cat)}
                                                            className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1 transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            <Plus className="h-3 w-3" /> Add item
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
