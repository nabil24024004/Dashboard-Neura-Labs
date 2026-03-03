"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
    Briefcase,
    Calendar,
    Clock,
    Play,
    Eye,
    CheckCircle2,
    RotateCcw,
    Star,
    ListTodo,
    Flag,
    ExternalLink,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface WorkItem {
    work_item_id: string;
    title: string;
    description: string | null;
    category: string;
    status: string;
    estimated_hours: number | null;
    actual_hours: number | null;
    due_date: string | null;
    project_id: string;
    project_name: string;
    project_progress: number | null;
    role_on_item: string;
    created_at: string;
}

interface Task {
    id: string;
    title: string;
    status: string;
    priority: string | null;
    deadline: string | null;
    project_id: string | null;
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

const ACTION_MAP: Record<string, { label: string; icon: React.ElementType; nextStatus: string } | null> = {
    not_started: { label: "Start Work", icon: Play, nextStatus: "in_progress" },
    in_progress: { label: "Submit for Review", icon: Eye, nextStatus: "in_review" },
    in_review: { label: "Approve", icon: CheckCircle2, nextStatus: "done" },
    done: null,
};

const PRIORITY_COLORS: Record<string, string> = {
    Urgent: "text-[#ef4444]",
    High: "text-[#f59e0b]",
    Medium: "text-primary",
    Low: "text-[#22c55e]",
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface Props {
    workItems: Record<string, unknown>[];
    tasks: Record<string, unknown>[];
}

export function MyWorkClient({ workItems: initialItems, tasks: initialTasks }: Props) {
    const [items, setItems] = useState<WorkItem[]>(initialItems as unknown as WorkItem[]);
    const [filter, setFilter] = useState<"all" | "not_started" | "in_progress" | "in_review" | "done">("all");
    const [isPending, startTransition] = useTransition();

    const handleStatusChange = useCallback(
        (workItemId: string, newStatus: string) => {
            startTransition(async () => {
                const res = await fetch("/api/work-items/status", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ work_item_id: workItemId, status: newStatus }),
                });
                if (res.ok) {
                    const data = await res.json();
                    setItems((prev) =>
                        prev.map((wi) =>
                            wi.work_item_id === workItemId ? { ...wi, status: data.work_item.status } : wi
                        )
                    );
                }
            });
        },
        []
    );

    const filteredItems = filter === "all" ? items : items.filter((wi) => wi.status === filter);
    const tasks = initialTasks as unknown as Task[];

    // Group by project
    const projectGroups = new Map<string, { name: string; items: WorkItem[] }>();
    for (const item of filteredItems) {
        const group = projectGroups.get(item.project_id) || {
            name: item.project_name,
            items: [],
        };
        group.items.push(item);
        projectGroups.set(item.project_id, group);
    }

    // Stats
    const totalItems = items.length;
    const inProgress = items.filter((wi) => wi.status === "in_progress").length;
    const inReview = items.filter((wi) => wi.status === "in_review").length;
    const done = items.filter((wi) => wi.status === "done").length;
    const totalHours = items.reduce((sum, wi) => sum + (wi.estimated_hours || 0), 0);

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Work</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    All work items assigned to you across projects.
                </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="text-xl font-bold text-foreground">{totalItems}</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-xs text-muted-foreground">In Progress</div>
                    <div className="text-xl font-bold text-[#3b82f6]">{inProgress}</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-xs text-muted-foreground">In Review</div>
                    <div className="text-xl font-bold text-[#a855f7]">{inReview}</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-xs text-muted-foreground">Completed</div>
                    <div className="text-xl font-bold text-[#22c55e]">{done}</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-xs text-muted-foreground">Est. Hours</div>
                    <div className="text-xl font-bold text-foreground">{totalHours}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                {(["all", "not_started", "in_progress", "in_review", "done"] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === f
                                ? "bg-primary/10 text-primary border-primary/30"
                                : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        {f === "all" ? "All" : STATUS_CONFIG[f]?.label || f}
                    </button>
                ))}
            </div>

            {/* Work items grouped by project */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
                {projectGroups.size === 0 ? (
                    <div className="text-center py-16">
                        <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                        <p className="text-foreground font-medium mb-1">
                            {filter === "all" ? "No work items assigned yet" : "No items match this filter"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Work items will appear here when you are assigned to project deliverables.
                        </p>
                    </div>
                ) : (
                    Array.from(projectGroups.entries()).map(([projectId, group]) => (
                        <div key={projectId}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-medium text-foreground">{group.name}</h3>
                                    <span className="text-xs text-muted-foreground">({group.items.length})</span>
                                </div>
                                <Link
                                    href={`/dashboard/projects/${projectId}`}
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                    View Project <ExternalLink className="h-3 w-3" />
                                </Link>
                            </div>

                            <div className="space-y-2">
                                {group.items.map((item) => {
                                    const action = ACTION_MAP[item.status];
                                    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.not_started;
                                    const ActionIcon = action?.icon;

                                    return (
                                        <div
                                            key={item.work_item_id}
                                            className="rounded-lg border border-border bg-card p-4 flex items-start gap-4 group hover:border-muted transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusCfg.color}`}>
                                                        {statusCfg.label}
                                                    </Badge>
                                                    {item.role_on_item === "lead" && (
                                                        <span className="text-[10px] text-[#f59e0b] flex items-center gap-0.5">
                                                            <Star className="h-2.5 w-2.5" /> Lead
                                                        </span>
                                                    )}
                                                    {item.role_on_item === "reviewer" && (
                                                        <span className="text-[10px] text-[#a855f7]">Reviewer</span>
                                                    )}
                                                </div>
                                                <p className="text-sm font-medium text-foreground">{item.title}</p>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                    <span>{item.category}</span>
                                                    {item.estimated_hours && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {item.estimated_hours} hrs
                                                        </span>
                                                    )}
                                                    {item.due_date && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {format(new Date(item.due_date), "MMM d, yyyy")}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {action && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isPending}
                                                    onClick={() => handleStatusChange(item.work_item_id, action.nextStatus)}
                                                    className="h-8 text-xs border-border shrink-0"
                                                >
                                                    {ActionIcon && <ActionIcon className="h-3 w-3 mr-1" />}
                                                    {action.label}
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}

                {/* Ad-hoc tasks section */}
                {tasks.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                            <ListTodo className="h-4 w-4" /> Ad-Hoc Tasks
                        </h3>
                        <div className="space-y-2">
                            {tasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="rounded-lg border border-border bg-card p-3 flex items-center gap-3"
                                >
                                    <div className="h-2 w-2 rounded-full bg-muted" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-foreground">{task.title}</p>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                            {task.priority && (
                                                <span className={`flex items-center gap-1 ${PRIORITY_COLORS[task.priority] || ""}`}>
                                                    <Flag className="h-3 w-3" />
                                                    {task.priority}
                                                </span>
                                            )}
                                            {task.deadline && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(task.deadline), "MMM d")}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
