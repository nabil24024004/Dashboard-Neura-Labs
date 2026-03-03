"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetClose,
} from "@/components/ui/sheet";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Loader2,
    Plus,
    X,
    Star,
    ChevronDown,
    ChevronRight,
    Upload,
    Download,
    Trash2,
    ArrowLeft,
    ArrowRight,
    Check,
    AlertCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type Client = { id: string; company_name: string };
type TeamMember = { id: string; first_name: string; last_name: string; email: string };

interface WorkItemAssignment {
    member_id: string;
    member_name: string;
    role_on_item: "lead" | "assignee" | "reviewer";
}

interface WorkItem {
    _key: string; // client-only key for React rendering
    title: string;
    category: string;
    description: string;
    estimated_hours: number | null;
    due_date: string;
    sort_order: number;
    assignments: WorkItemAssignment[];
}

interface ProjectForm {
    project_name: string;
    service_type: string;
    client_id: string;
    status: string;
    deadline: string;
    budget: string;
    description: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS = ["Lead", "Planning", "In Progress", "Review", "Completed", "On Hold"] as const;

const EMPTY_FORM: ProjectForm = {
    project_name: "",
    service_type: "",
    client_id: "",
    status: "Planning",
    deadline: "",
    budget: "",
    description: "",
};

let keyCounter = 0;
function nextKey() {
    return `wi_${++keyCounter}_${Date.now()}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface ProjectWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProjectCreated: (project: Record<string, unknown>) => void;
}

export function ProjectWizard({ open, onOpenChange, onProjectCreated }: ProjectWizardProps) {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);
    const [workItems, setWorkItems] = useState<WorkItem[]>([]);
    const [categories, setCategories] = useState<string[]>(["Design", "Development", "QA"]);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

    const [clients, setClients] = useState<Client[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [importErrors, setImportErrors] = useState<{ path: string; message: string; value?: unknown }[]>([]);
    const [isPending, startTransition] = useTransition();

    // Load clients and team members
    useEffect(() => {
        if (!open) return;
        fetch("/api/clients")
            .then((r) => r.json())
            .then((p) => setClients(Array.isArray(p?.clients) ? p.clients : []))
            .catch(() => { });

        fetch("/api/work-items/import", { method: "OPTIONS" }).catch(() => { });
        // Fetch team members from users table
        fetch("/api/team-members")
            .then((r) => r.json())
            .then((p) => setTeamMembers(Array.isArray(p?.members) ? p.members : []))
            .catch(() => { });
    }, [open]);

    // Reset on close
    useEffect(() => {
        if (!open) {
            setStep(1);
            setForm(EMPTY_FORM);
            setWorkItems([]);
            setError(null);
            setImportErrors([]);
            setShowAddCategory(false);
        }
    }, [open]);

    /* ---- Step 2: work item manipulation ---- */

    const addWorkItem = useCallback((category: string) => {
        setWorkItems((prev) => [
            ...prev,
            {
                _key: nextKey(),
                title: "",
                category,
                description: "",
                estimated_hours: null,
                due_date: "",
                sort_order: prev.filter((w) => w.category === category).length,
                assignments: [],
            },
        ]);
    }, []);

    const updateWorkItem = useCallback((key: string, patch: Partial<WorkItem>) => {
        setWorkItems((prev) => prev.map((w) => (w._key === key ? { ...w, ...patch } : w)));
    }, []);

    const removeWorkItem = useCallback((key: string) => {
        setWorkItems((prev) => prev.filter((w) => w._key !== key));
    }, []);

    const addAssignment = useCallback((itemKey: string, member: TeamMember) => {
        setWorkItems((prev) =>
            prev.map((w) => {
                if (w._key !== itemKey) return w;
                if (w.assignments.some((a) => a.member_id === member.id)) return w;
                const isLead = w.assignments.length === 0;
                return {
                    ...w,
                    assignments: [
                        ...w.assignments,
                        {
                            member_id: member.id,
                            member_name: `${member.first_name} ${member.last_name}`.trim(),
                            role_on_item: isLead ? "lead" : "assignee",
                        },
                    ],
                };
            })
        );
    }, []);

    const removeAssignment = useCallback((itemKey: string, memberId: string) => {
        setWorkItems((prev) =>
            prev.map((w) => {
                if (w._key !== itemKey) return w;
                const filtered = w.assignments.filter((a) => a.member_id !== memberId);
                // If removed lead, promote first remaining to lead
                if (filtered.length > 0 && !filtered.some((a) => a.role_on_item === "lead")) {
                    filtered[0].role_on_item = "lead";
                }
                return { ...w, assignments: filtered };
            })
        );
    }, []);

    const setAssignmentRole = useCallback(
        (itemKey: string, memberId: string, role: "lead" | "assignee" | "reviewer") => {
            setWorkItems((prev) =>
                prev.map((w) => {
                    if (w._key !== itemKey) return w;
                    return {
                        ...w,
                        assignments: w.assignments.map((a) => {
                            if (a.member_id === memberId) return { ...a, role_on_item: role };
                            // If setting this one as lead, demote all other leads to assignee
                            if (role === "lead" && a.role_on_item === "lead") return { ...a, role_on_item: "assignee" };
                            return a;
                        }),
                    };
                })
            );
        },
        []
    );

    const toggleCategory = useCallback((cat: string) => {
        setCollapsedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    }, []);

    /* ---- JSON Import ---- */

    const handleJsonImport = useCallback(
        async (file: File) => {
            setImportErrors([]);
            setError(null);
            try {
                const text = await file.text();
                const json = JSON.parse(text);

                const res = await fetch("/api/work-items/import", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(json),
                });

                const result = await res.json();

                if (!result.valid) {
                    setImportErrors(result.errors || []);
                    return;
                }

                // Populate work items from parsed data
                const newItems: WorkItem[] = result.parsed_items.map(
                    (item: {
                        title: string;
                        category: string;
                        description: string;
                        estimated_hours: number | null;
                        due_date: string | null;
                        sort_order: number;
                        assignments: WorkItemAssignment[];
                    }) => ({
                        _key: nextKey(),
                        title: item.title,
                        category: item.category,
                        description: item.description,
                        estimated_hours: item.estimated_hours,
                        due_date: item.due_date || "",
                        sort_order: item.sort_order,
                        assignments: item.assignments,
                    })
                );

                // Add any new categories from import
                const importCategories = [...new Set(newItems.map((i: WorkItem) => i.category))];
                setCategories((prev) => {
                    const merged = [...new Set([...prev, ...importCategories])];
                    return merged;
                });

                setWorkItems((prev) => [...prev, ...newItems]);

                // Override project name/description if provided
                if (result.project_overrides?.name) {
                    setForm((prev) => ({ ...prev, project_name: result.project_overrides.name }));
                }
                if (result.project_overrides?.description) {
                    setForm((prev) => ({ ...prev, description: result.project_overrides.description }));
                }
            } catch {
                setError("Failed to parse JSON file. Please check the format.");
            }
        },
        []
    );

    const downloadTemplate = useCallback(() => {
        const memberNames = teamMembers.map((m) => `${m.first_name} ${m.last_name}`.trim());
        const template = {
            project: { name: form.project_name || "Your Project Name", description: "" },
            work_items: [
                {
                    title: "Example Work Item 1",
                    category: "Design",
                    description: "Description of the work to be done",
                    estimated_hours: 20,
                    due_date: "2026-04-01",
                    assignments: [
                        { member: memberNames[0] || "Member Name", role: "lead" },
                        ...(memberNames[1] ? [{ member: memberNames[1], role: "reviewer" }] : []),
                    ],
                },
                {
                    title: "Example Work Item 2",
                    category: "Development",
                    estimated_hours: 40,
                    assignments: [{ member: memberNames[1] || "Member Name", role: "lead" }],
                },
                {
                    title: "Example Work Item 3",
                    category: "QA",
                    estimated_hours: 16,
                    assignments: [{ member: memberNames[2] || "Member Name", role: "lead" }],
                },
            ],
        };

        const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${form.project_name || "project"}-work-breakdown-template.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [form.project_name, teamMembers]);

    /* ---- Step navigation ---- */

    function validateStep1(): boolean {
        if (!form.project_name.trim()) { setError("Project name is required"); return false; }
        if (!form.client_id) { setError("Client is required"); return false; }
        if (!form.service_type.trim()) { setError("Service type is required"); return false; }
        setError(null);
        return true;
    }

    function validateStep2(): boolean {
        if (workItems.length === 0) { setError("Add at least one work item"); return false; }
        for (const item of workItems) {
            if (!item.title.trim()) { setError("All work items must have a title"); return false; }
            if (item.assignments.length === 0) { setError(`Work item "${item.title}" has no assignments`); return false; }
            if (!item.assignments.some((a) => a.role_on_item === "lead")) {
                setError(`Work item "${item.title}" needs a lead assignment`);
                return false;
            }
        }
        setError(null);
        return true;
    }

    /* ---- Create project ---- */

    async function handleCreate() {
        setError(null);
        startTransition(async () => {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    budget: form.budget ? Number(form.budget) : undefined,
                    work_items: workItems.map((wi) => ({
                        title: wi.title,
                        category: wi.category,
                        description: wi.description || undefined,
                        estimated_hours: wi.estimated_hours,
                        due_date: wi.due_date || undefined,
                        sort_order: wi.sort_order,
                        assignments: wi.assignments.map((a) => ({
                            member_id: a.member_id,
                            role_on_item: a.role_on_item,
                        })),
                    })),
                    work_breakdown_imported: workItems.length > 0,
                }),
            });

            const payload = await res.json().catch(() => null);
            if (!res.ok) {
                setError(payload?.error ?? "Failed to create project");
                return;
            }

            onProjectCreated(payload.project);
            onOpenChange(false);
        });
    }

    /* ---- Derived data ---- */

    const itemsByCategory = categories.reduce<Record<string, WorkItem[]>>((acc, cat) => {
        acc[cat] = workItems.filter((w) => w.category === cat);
        return acc;
    }, {});

    // Include uncategorized items
    const uncategorized = workItems.filter((w) => !categories.includes(w.category));
    if (uncategorized.length > 0) {
        itemsByCategory["General"] = [...(itemsByCategory["General"] || []), ...uncategorized];
        if (!categories.includes("General")) {
            setCategories((prev) => [...prev, "General"]);
        }
    }

    const totalItems = workItems.length;
    const totalHours = workItems.reduce((sum, w) => sum + (w.estimated_hours || 0), 0);
    const uniqueMembers = new Set(workItems.flatMap((w) => w.assignments.map((a) => a.member_id))).size;

    /* ---- Render ---- */

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                showCloseButton={false}
                className="w-[860px] max-w-[92vw] bg-background border-l border-border text-foreground p-0 flex flex-col overflow-hidden"
                side="right"
            >
                <SheetHeader className="p-6 pb-4 border-b border-border shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <SheetTitle className="text-foreground text-lg">
                                {step === 1 ? "New Project" : step === 2 ? "Work Breakdown" : "Review & Create"}
                            </SheetTitle>
                            <p className="text-xs text-muted-foreground mt-1">Step {step} of 3</p>
                        </div>
                        <SheetClose className="rounded-sm p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                            <X className="h-4 w-4" />
                        </SheetClose>
                    </div>

                    {/* Progress indicator */}
                    <div className="flex gap-1.5 mt-3">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-accent"
                                    }`}
                            />
                        ))}
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {error && (
                        <div className="flex items-start gap-2 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-2 text-sm text-red-700 dark:text-[#fca5a5]">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* ============ STEP 1: Project Details ============ */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <p className="text-sm text-muted-foreground">
                                Fill in the basic project information.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Project Name *</label>
                                    <Input
                                        value={form.project_name}
                                        onChange={(e) => setForm((p) => ({ ...p, project_name: e.target.value }))}
                                        placeholder="Website Redesign"
                                        className="bg-background border-border text-foreground placeholder:text-muted-foreground h-10"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Service Type *</label>
                                    <Input
                                        value={form.service_type}
                                        onChange={(e) => setForm((p) => ({ ...p, service_type: e.target.value }))}
                                        placeholder="Web Development"
                                        className="bg-background border-border text-foreground placeholder:text-muted-foreground h-10"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Client *</label>
                                    <select
                                        value={form.client_id}
                                        onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}
                                        className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                                    >
                                        <option value="">Select client…</option>
                                        {clients.map((c) => (
                                            <option key={c.id} value={c.id}>{c.company_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
                                    <select
                                        value={form.status}
                                        onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                                        className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                                    >
                                        {STATUS_OPTIONS.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Deadline</label>
                                    <Input
                                        type="date"
                                        value={form.deadline}
                                        onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                                        className="bg-background border-border text-foreground h-10 w-full"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Budget ($)</label>
                                    <Input
                                        type="number"
                                        value={form.budget}
                                        onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
                                        placeholder="5,000"
                                        className="bg-background border-border text-foreground placeholder:text-muted-foreground h-10 w-full"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                    placeholder="Brief project description…"
                                    rows={3}
                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50 resize-none transition-colors"
                                />
                            </div>
                        </div>
                    )}

                    {/* ============ STEP 2: Work Breakdown ============ */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Define work items and assign them to team members. Each item contributes to the project progress.
                            </p>

                            {/* JSON Import Zone */}
                            <div className="rounded-lg border border-dashed border-border bg-card/50 p-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-md cursor-pointer hover:bg-primary/20 transition-colors">
                                        <Upload className="h-3.5 w-3.5" />
                                        Import JSON
                                        <input
                                            type="file"
                                            accept=".json"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) void handleJsonImport(file);
                                                e.target.value = "";
                                            }}
                                        />
                                    </label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={downloadTemplate}
                                        className="text-xs text-muted-foreground hover:text-foreground h-7"
                                    >
                                        <Download className="h-3.5 w-3.5 mr-1" />
                                        Download Template
                                    </Button>
                                    <span className="text-xs text-muted-foreground">or fill manually below</span>
                                </div>
                            </div>

                            {/* Import Validation Errors */}
                            {importErrors.length > 0 && (
                                <div className="rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/10 p-4 space-y-2">
                                    <h4 className="text-sm font-medium text-[#f59e0b]">
                                        ⚠ JSON Validation Failed — {importErrors.length} error{importErrors.length > 1 ? "s" : ""} found
                                    </h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {importErrors.map((err, i) => (
                                            <div key={i} className="text-xs">
                                                <code className="text-[#f59e0b]/80">{err.path}</code>
                                                <p className="text-foreground/70 mt-0.5">→ {err.message}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setImportErrors([])}
                                            className="text-xs h-7"
                                        >
                                            Dismiss
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                const blob = new Blob([JSON.stringify(importErrors, null, 2)], { type: "application/json" });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement("a");
                                                a.href = url;
                                                a.download = "validation-errors.json";
                                                a.click();
                                                URL.revokeObjectURL(url);
                                            }}
                                            className="text-xs h-7"
                                        >
                                            Download Error Report
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Category buttons */}
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addWorkItem(categories[0] || "General")}
                                    className="text-xs h-7 border-border"
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Add Work Item
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowAddCategory(true)}
                                    className="text-xs h-7 border-border"
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Add Category
                                </Button>
                            </div>

                            {showAddCategory && (
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="Category name"
                                        className="h-8 text-sm bg-background border-border w-48"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && newCategoryName.trim()) {
                                                setCategories((prev) =>
                                                    prev.includes(newCategoryName.trim()) ? prev : [...prev, newCategoryName.trim()]
                                                );
                                                setNewCategoryName("");
                                                setShowAddCategory(false);
                                            }
                                        }}
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            if (newCategoryName.trim()) {
                                                setCategories((prev) =>
                                                    prev.includes(newCategoryName.trim()) ? prev : [...prev, newCategoryName.trim()]
                                                );
                                                setNewCategoryName("");
                                                setShowAddCategory(false);
                                            }
                                        }}
                                        className="h-8 text-xs"
                                    >
                                        Add
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => { setShowAddCategory(false); setNewCategoryName(""); }}
                                        className="h-8 text-xs text-muted-foreground"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            )}

                            {/* Work items by category */}
                            {categories.map((cat) => {
                                const items = itemsByCategory[cat] || [];
                                const isCollapsed = collapsedCategories.has(cat);

                                return (
                                    <div key={cat} className="rounded-lg border border-border bg-card overflow-hidden">
                                        <button
                                            onClick={() => toggleCategory(cat)}
                                            className="w-full flex items-center justify-between p-3 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"
                                        >
                                            <span className="flex items-center gap-2">
                                                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                {cat}
                                                <span className="text-xs text-muted-foreground font-normal">
                                                    {items.length} item{items.length !== 1 ? "s" : ""}
                                                </span>
                                            </span>
                                        </button>

                                        {!isCollapsed && (
                                            <div className="border-t border-border">
                                                {items.length === 0 ? (
                                                    <div className="p-4 text-center text-xs text-muted-foreground">
                                                        No items in this category.{" "}
                                                        <button
                                                            onClick={() => addWorkItem(cat)}
                                                            className="text-primary hover:underline"
                                                        >
                                                            Add one
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="divide-y divide-border">
                                                        {items.map((item) => (
                                                            <WorkItemRow
                                                                key={item._key}
                                                                item={item}
                                                                teamMembers={teamMembers}
                                                                onUpdate={(patch) => updateWorkItem(item._key, patch)}
                                                                onRemove={() => removeWorkItem(item._key)}
                                                                onAddAssignment={(member) => addAssignment(item._key, member)}
                                                                onRemoveAssignment={(memberId) => removeAssignment(item._key, memberId)}
                                                                onSetRole={(memberId, role) => setAssignmentRole(item._key, memberId, role)}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="p-2 border-t border-border">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => addWorkItem(cat)}
                                                        className="text-xs h-7 text-muted-foreground hover:text-foreground w-full"
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" /> Add item to {cat}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Summary footer */}
                            {totalItems > 0 && (
                                <div className="text-xs text-muted-foreground text-center">
                                    {totalItems} work item{totalItems !== 1 ? "s" : ""} · {uniqueMembers} member{uniqueMembers !== 1 ? "s" : ""} assigned · Est. Total: {totalHours} hrs
                                </div>
                            )}
                        </div>
                    )}

                    {/* ============ STEP 3: Review ============ */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Review your project before creating it.
                            </p>

                            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                    <div><span className="text-muted-foreground">Project:</span> <span className="font-medium">{form.project_name}</span></div>
                                    <div><span className="text-muted-foreground">Client:</span> <span className="font-medium">{clients.find((c) => c.id === form.client_id)?.company_name || "—"}</span></div>
                                    <div><span className="text-muted-foreground">Service:</span> <span className="font-medium">{form.service_type}</span></div>
                                    <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{form.status}</span></div>
                                    {form.deadline && <div><span className="text-muted-foreground">Deadline:</span> <span className="font-medium">{form.deadline}</span></div>}
                                    {form.budget && <div><span className="text-muted-foreground">Budget:</span> <span className="font-medium">${Number(form.budget).toLocaleString()}</span></div>}
                                </div>
                            </div>

                            {/* Work Breakdown Summary */}
                            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                                <h4 className="text-sm font-medium">Work Breakdown</h4>
                                {categories.map((cat) => {
                                    const items = itemsByCategory[cat] || [];
                                    if (items.length === 0) return null;
                                    return (
                                        <div key={cat}>
                                            <h5 className="text-xs font-medium text-muted-foreground mb-1.5">
                                                {cat} ({items.length} item{items.length !== 1 ? "s" : ""})
                                            </h5>
                                            <div className="space-y-1.5 pl-2">
                                                {items.map((item) => (
                                                    <div key={item._key} className="flex items-start justify-between text-sm">
                                                        <div>
                                                            <span className="text-foreground">· {item.title}</span>
                                                            <span className="text-muted-foreground ml-2 text-xs">
                                                                {item.assignments
                                                                    .map((a) => `${a.member_name}${a.role_on_item === "lead" ? " (lead)" : a.role_on_item === "reviewer" ? " (reviewer)" : ""}`)
                                                                    .join(", ")}
                                                            </span>
                                                        </div>
                                                        {item.estimated_hours && (
                                                            <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                                                {item.estimated_hours} hrs
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="border-t border-border pt-2 text-xs text-muted-foreground">
                                    Total: {totalItems} work items · {uniqueMembers} members · {totalHours} est. hrs
                                    <br />
                                    Initial project progress: 0%
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer navigation */}
                <div className="border-t border-border p-4 flex items-center justify-between shrink-0">
                    <div>
                        {step > 1 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setStep(step - 1); setError(null); }}
                                className="text-muted-foreground"
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" /> Back
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                            className="text-muted-foreground"
                        >
                            Cancel
                        </Button>
                        {step < 3 ? (
                            <Button
                                size="sm"
                                onClick={() => {
                                    if (step === 1 && !validateStep1()) return;
                                    if (step === 2 && !validateStep2()) return;
                                    setStep(step + 1);
                                }}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                Next <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                disabled={isPending}
                                onClick={handleCreate}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                <Check className="h-4 w-4 mr-1" />
                                Create Project
                            </Button>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

/* ------------------------------------------------------------------ */
/*  WorkItemRow — a single inline-editable work item row              */
/* ------------------------------------------------------------------ */

function WorkItemRow({
    item,
    teamMembers,
    onUpdate,
    onRemove,
    onAddAssignment,
    onRemoveAssignment,
    onSetRole,
}: {
    item: WorkItem;
    teamMembers: TeamMember[];
    onUpdate: (patch: Partial<WorkItem>) => void;
    onRemove: () => void;
    onAddAssignment: (member: TeamMember) => void;
    onRemoveAssignment: (memberId: string) => void;
    onSetRole: (memberId: string, role: "lead" | "assignee" | "reviewer") => void;
}) {
    const [showMemberPicker, setShowMemberPicker] = useState(false);
    const [rolePopover, setRolePopover] = useState<string | null>(null);

    const assignedIds = new Set(item.assignments.map((a) => a.member_id));
    const availableMembers = teamMembers.filter((m) => !assignedIds.has(m.id));

    return (
        <div className="p-3 space-y-2">
            <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                    <Input
                        value={item.title}
                        onChange={(e) => onUpdate({ title: e.target.value })}
                        placeholder="Work item title"
                        className="h-8 text-sm bg-background border-border"
                    />
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            value={item.estimated_hours ?? ""}
                            onChange={(e) => onUpdate({ estimated_hours: e.target.value ? Number(e.target.value) : null })}
                            placeholder="Est. hrs"
                            className="h-7 text-xs bg-background border-border w-20"
                        />
                        <Input
                            type="date"
                            value={item.due_date}
                            onChange={(e) => onUpdate({ due_date: e.target.value })}
                            className="h-7 text-xs bg-background border-border w-36"
                        />
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRemove}
                    className="h-7 w-7 text-muted-foreground hover:text-[#ef4444] shrink-0"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Assignments */}
            <div className="flex flex-wrap items-center gap-1.5">
                {item.assignments.map((a) => (
                    <Popover key={a.member_id} open={rolePopover === a.member_id} onOpenChange={(open) => setRolePopover(open ? a.member_id : null)}>
                        <PopoverTrigger asChild>
                            <button
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${a.role_on_item === "lead"
                                    ? "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#f59e0b]"
                                    : a.role_on_item === "reviewer"
                                        ? "border-[#a855f7]/40 bg-[#a855f7]/10 text-[#a855f7]"
                                        : "border-border bg-accent text-foreground"
                                    }`}
                            >
                                {a.role_on_item === "lead" && <Star className="h-2.5 w-2.5" />}
                                {a.member_name.split(" ")[0]}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2" align="start">
                            <p className="text-xs font-medium text-foreground mb-1.5 px-1">{a.member_name}</p>
                            {(["lead", "assignee", "reviewer"] as const).map((role) => (
                                <button
                                    key={role}
                                    onClick={() => { onSetRole(a.member_id, role); setRolePopover(null); }}
                                    className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-accent transition-colors capitalize ${a.role_on_item === role ? "text-primary font-medium" : "text-foreground"
                                        }`}
                                >
                                    {a.role_on_item === role ? "● " : "○ "}{role}
                                </button>
                            ))}
                            <div className="border-t border-border mt-1 pt-1">
                                <button
                                    onClick={() => { onRemoveAssignment(a.member_id); setRolePopover(null); }}
                                    className="w-full text-left px-2 py-1 text-xs rounded text-[#ef4444] hover:bg-[#ef4444]/10"
                                >
                                    Remove from item
                                </button>
                            </div>
                        </PopoverContent>
                    </Popover>
                ))}

                {/* Add member button */}
                {availableMembers.length > 0 && (
                    <Popover open={showMemberPicker} onOpenChange={setShowMemberPicker}>
                        <PopoverTrigger asChild>
                            <button
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-muted transition-colors"
                            >
                                <Plus className="h-2.5 w-2.5" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-1" align="start">
                            {availableMembers.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => { onAddAssignment(m); setShowMemberPicker(false); }}
                                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors text-foreground"
                                >
                                    {m.first_name} {m.last_name}
                                </button>
                            ))}
                        </PopoverContent>
                    </Popover>
                )}
            </div>
        </div>
    );
}
