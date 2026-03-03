"use client";

import {
  useState,
  useEffect,
  useTransition,
  useCallback,
} from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Plus,
  Loader2,
  Trash2,
  Calendar,
  Flag,
  Play,
  Eye,
  CheckCircle2,
  RotateCcw,
  Star,
  Briefcase,
  ListTodo,
} from "lucide-react";
import { format, isPast, isToday, isBefore, addDays } from "date-fns";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: "Low" | "Medium" | "High" | "Urgent" | null;
  deadline: string | null;
  status: string;
  is_completed?: boolean;
  project_id: string | null;
}

interface WorkItemForPanel {
  work_item_id: string;
  title: string;
  status: string;
  project_name: string;
  project_id: string;
  role_on_item: string;
  due_date: string | null;
  category: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const PRIORITY_STYLES: Record<string, string> = {
  Urgent: "text-[#ef4444]",
  High: "text-[#f59e0b]",
  Medium: "text-primary",
  Low: "text-[#22c55e]",
};

const WI_STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Completed",
};

const WI_STATUS_COLORS: Record<string, string> = {
  not_started: "border-[#737373] text-muted-foreground bg-accent",
  in_progress: "border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10",
  in_review: "border-[#a855f7] text-[#a855f7] bg-[#a855f7]/10",
  done: "border-[#22c55e] text-[#22c55e] bg-[#22c55e]/10",
};

const WI_ACTIONS: Record<string, { label: string; icon: React.ElementType; nextStatus: string } | null> = {
  not_started: { label: "Start", icon: Play, nextStatus: "in_progress" },
  in_progress: { label: "To Review", icon: Eye, nextStatus: "in_review" },
  in_review: { label: "Approve", icon: CheckCircle2, nextStatus: "done" },
  done: null,
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface TasksPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTasksChanged?: () => void;
}

export function TasksPanel({
  open,
  onOpenChange,
  onTasksChanged,
}: TasksPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workItems, setWorkItems] = useState<WorkItemForPanel[]>([]);
  const [section, setSection] = useState<"work-items" | "tasks">("work-items");
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  // Fetch tasks and work items
  const fetchAll = useCallback(async () => {
    try {
      const [tasksRes, wiRes] = await Promise.all([
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/work-items?my_items=true", { cache: "no-store" }),
      ]);

      const tasksData = await tasksRes.json().catch(() => null);
      const wiData = await wiRes.json().catch(() => null);

      setTasks(Array.isArray(tasksData?.tasks) ? tasksData.tasks : []);
      setWorkItems(Array.isArray(wiData?.work_items) ? wiData.work_items : []);
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    if (open) void fetchAll();
  }, [open, fetchAll]);

  // Task actions
  const addTask = useCallback(() => {
    if (!newTaskTitle.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle.trim(), priority: "Medium" }),
      });
      if (res.ok) {
        setNewTaskTitle("");
        setShowAddTask(false);
        await fetchAll();
        onTasksChanged?.();
      }
    });
  }, [newTaskTitle, onTasksChanged, fetchAll]);

  const deleteTask = useCallback(
    (id: string) => {
      startTransition(async () => {
        const res = await fetch("/api/tasks", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (res.ok) {
          await fetchAll();
          onTasksChanged?.();
        }
      });
    },
    [onTasksChanged, fetchAll]
  );

  const completeTask = useCallback(
    (id: string) => {
      startTransition(async () => {
        const res = await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: "Done" }),
        });
        if (res.ok) {
          await fetchAll();
          onTasksChanged?.();
        }
      });
    },
    [onTasksChanged, fetchAll]
  );

  // Work item status change
  const changeWorkItemStatus = useCallback(
    (workItemId: string, newStatus: string) => {
      startTransition(async () => {
        const res = await fetch("/api/work-items/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ work_item_id: workItemId, status: newStatus }),
        });
        if (res.ok) {
          await fetchAll();
          onTasksChanged?.();
        }
      });
    },
    [onTasksChanged, fetchAll]
  );

  // Categorize tasks
  const openTasks = tasks.filter(
    (t) => t.status !== "Done" && !t.is_completed
  );

  const now = new Date();

  const overdueTasks = openTasks.filter((t) => {
    if (!t.deadline) return false;
    const d = new Date(t.deadline);
    return isPast(d) && !isToday(d);
  });

  const todayTasks = openTasks.filter((t) => {
    if (!t.deadline) return false;
    return isToday(new Date(t.deadline));
  });

  const upcomingTasks = openTasks.filter((t) => {
    if (!t.deadline) return true;
    const d = new Date(t.deadline);
    return !isPast(d) && !isToday(d);
  });

  // Categorize work items by status
  const activeWorkItems = workItems.filter((wi) => wi.status !== "done");
  const doneWorkItems = workItems.filter((wi) => wi.status === "done");

  // Badge counts
  const workItemsNeedingAction = workItems.filter(
    (wi) => wi.status !== "done"
  ).length;
  const openTaskCount = openTasks.length;
  const totalBadge = workItemsNeedingAction + openTaskCount;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        showCloseButton={false}
        className="w-[500px] max-w-[90vw] bg-background border-l border-border text-foreground p-0 flex flex-col"
        side="right"
      >
        <SheetHeader className="p-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-foreground text-base">My Tasks</SheetTitle>
            <SheetClose className="rounded-sm p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <X className="h-4 w-4" />
            </SheetClose>
          </div>

          {/* Section toggle */}
          <div className="flex items-center gap-1 mt-3 bg-card rounded-lg border border-border p-1">
            <button
              onClick={() => setSection("work-items")}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${section === "work-items"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              Work Items
              {workItemsNeedingAction > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-primary/20 text-primary text-[10px] leading-4 text-center">
                  {workItemsNeedingAction}
                </span>
              )}
            </button>
            <button
              onClick={() => setSection("tasks")}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${section === "tasks"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <ListTodo className="h-3.5 w-3.5" />
              Tasks
              {openTaskCount > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-primary/20 text-primary text-[10px] leading-4 text-center">
                  {openTaskCount}
                </span>
              )}
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* ======== WORK ITEMS SECTION ======== */}
          {section === "work-items" && (
            <div className="p-5 space-y-4">
              {activeWorkItems.length === 0 && doneWorkItems.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-foreground font-medium">No work items assigned</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Work items will appear here when you are assigned to project deliverables.
                  </p>
                </div>
              ) : (
                <>
                  {/* Active items grouped by status */}
                  {(["in_review", "in_progress", "not_started"] as const).map((statusGroup) => {
                    const items = activeWorkItems.filter((wi) => wi.status === statusGroup);
                    if (items.length === 0) return null;

                    return (
                      <div key={statusGroup}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {WI_STATUS_LABELS[statusGroup]}
                          </span>
                          <span className="text-xs text-muted-foreground">({items.length})</span>
                        </div>
                        <div className="space-y-2">
                          {items.map((wi) => {
                            const action = WI_ACTIONS[wi.status];
                            const ActionIcon = action?.icon;
                            return (
                              <div
                                key={wi.work_item_id}
                                className="rounded-lg border border-border bg-card p-3 hover:border-muted transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${WI_STATUS_COLORS[wi.status]}`}>
                                        {WI_STATUS_LABELS[wi.status]}
                                      </Badge>
                                      {wi.role_on_item === "lead" && (
                                        <Star className="h-3 w-3 text-[#f59e0b]" />
                                      )}
                                    </div>
                                    <p className="text-sm font-medium text-foreground truncate">{wi.title}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {wi.project_name} · {wi.category}
                                    </p>
                                    {wi.due_date && (
                                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(wi.due_date), "MMM d")}
                                      </p>
                                    )}
                                  </div>
                                  {action && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={isPending}
                                      onClick={() => changeWorkItemStatus(wi.work_item_id, action.nextStatus)}
                                      className="h-7 text-xs border-border shrink-0"
                                    >
                                      {ActionIcon && <ActionIcon className="h-3 w-3 mr-1" />}
                                      {action.label}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Completed items */}
                  {doneWorkItems.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Recently Completed ({doneWorkItems.length})
                      </span>
                      <div className="space-y-1 mt-2">
                        {doneWorkItems.slice(0, 5).map((wi) => (
                          <div key={wi.work_item_id} className="flex items-center gap-2 text-sm py-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#22c55e]" />
                            <span className="text-muted-foreground line-through truncate">{wi.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ======== TASKS SECTION ======== */}
          {section === "tasks" && (
            <div className="p-5 space-y-4">
              {/* Add task */}
              {showAddTask ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="New task title…"
                    className="h-8 text-sm bg-background border-border flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addTask();
                      if (e.key === "Escape") { setShowAddTask(false); setNewTaskTitle(""); }
                    }}
                  />
                  <Button size="sm" disabled={isPending} onClick={addTask} className="h-8 text-xs">
                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowAddTask(false); setNewTaskTitle(""); }} className="h-8 text-xs text-muted-foreground">
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddTask(true)}
                  className="w-full border-dashed border-border text-muted-foreground"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Task
                </Button>
              )}

              {openTasks.length === 0 ? (
                <div className="text-center py-8">
                  <ListTodo className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-foreground font-medium">All tasks completed!</p>
                </div>
              ) : (
                <>
                  {overdueTasks.length > 0 && (
                    <TaskGroup label="Overdue" tasks={overdueTasks} tone="critical" onComplete={completeTask} onDelete={deleteTask} isPending={isPending} />
                  )}
                  {todayTasks.length > 0 && (
                    <TaskGroup label="Today" tasks={todayTasks} tone="warning" onComplete={completeTask} onDelete={deleteTask} isPending={isPending} />
                  )}
                  {upcomingTasks.length > 0 && (
                    <TaskGroup label="Upcoming" tasks={upcomingTasks} tone="neutral" onComplete={completeTask} onDelete={deleteTask} isPending={isPending} />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  TaskGroup sub-component                                           */
/* ------------------------------------------------------------------ */

function TaskGroup({
  label,
  tasks,
  tone,
  onComplete,
  onDelete,
  isPending,
}: {
  label: string;
  tasks: Task[];
  tone: "critical" | "warning" | "neutral";
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  const toneColor = tone === "critical" ? "text-[#ef4444]" : tone === "warning" ? "text-[#f59e0b]" : "text-muted-foreground";

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-medium uppercase tracking-wider ${toneColor}`}>
          {label}
        </span>
        <span className="text-xs text-muted-foreground">({tasks.length})</span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-lg border border-border bg-card p-3 flex items-start gap-3 group hover:border-muted transition-colors"
          >
            <button
              onClick={() => onComplete(task.id)}
              disabled={isPending}
              className="mt-0.5 h-4 w-4 rounded-full border-2 border-border hover:border-primary hover:bg-primary/20 transition-colors shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{task.title}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {task.priority && (
                  <span className={`flex items-center gap-1 ${PRIORITY_STYLES[task.priority] || ""}`}>
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
            <button
              onClick={() => onDelete(task.id)}
              disabled={isPending}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-[#ef4444] transition-all p-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
