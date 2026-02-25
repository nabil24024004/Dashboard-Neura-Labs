"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, isToday, startOfDay } from "date-fns";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, X } from "lucide-react";

interface TasksPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTasksChanged?: () => void;
}

type TaskPriority = "Urgent" | "High" | "Medium" | "Low";
type TaskStatus = "To Do" | "In Progress" | "In Review" | "Done";

interface Task {
  id: string;
  title: string;
  assigned_to: string | null;
  project_id: string | null;
  priority: TaskPriority;
  deadline: string | null;
  status: TaskStatus;
  description: string | null;
  created_at: string;
}

const priorityColorMap: Record<TaskPriority, string> = {
  Urgent: "bg-[#ef4444]",
  High:   "bg-[#f59e0b]",
  Medium: "bg-[#eab308]",
  Low:    "bg-[#22c55e]",
};

function taskMeta(task: Task): string {
  if (!task.deadline) return "No due date";
  const dueDate = new Date(task.deadline);
  if (Number.isNaN(dueDate.getTime())) return "No due date";
  const dueLabel = isToday(dueDate) ? "Due Today" : `Due ${format(dueDate, "MMM d")}`;
  return dueLabel;
}

function addId(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  next.add(id);
  return next;
}

function removeId(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  next.delete(id);
  return next;
}

export function TasksPanel({ open, onOpenChange, onTasksChanged }: TasksPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [newTask, setNewTask] = useState({
    title: "",
    dueDate: "",
    priority: "Medium" as TaskPriority,
  });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        setError(payload?.error ?? "Failed to load tasks");
        return;
      }

      setTasks(Array.isArray(payload?.tasks) ? payload.tasks : []);
    } catch {
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void fetchTasks();
  }, [open, fetchTasks]);

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "Done"), [tasks]);
  const todayBoundary = startOfDay(new Date());

  const overdueTasks = useMemo(() =>
    openTasks.filter((t) => {
      if (!t.deadline) return false;
      const d = new Date(t.deadline);
      return !Number.isNaN(d.getTime()) && d < todayBoundary;
    }),
    [openTasks, todayBoundary]
  );

  const todayTasks = useMemo(() =>
    openTasks.filter((t) => {
      if (!t.deadline) return false;
      const d = new Date(t.deadline);
      return !Number.isNaN(d.getTime()) && isToday(d);
    }),
    [openTasks]
  );

  const upcomingTasks = useMemo(() =>
    openTasks.filter((t) => {
      if (!t.deadline) return true;
      const d = new Date(t.deadline);
      return !Number.isNaN(d.getTime()) && d > todayBoundary && !isToday(d);
    }),
    [openTasks, todayBoundary]
  );

  async function createTask() {
    const title = newTask.title.trim();
    if (!title) {
      setError("Task title is required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          dueDate: newTask.dueDate || null,
          priority: newTask.priority,
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(payload?.error ?? "Failed to create task");
        return;
      }

      if (payload?.error) {
        setError(payload.error);
        return;
      }

      // Refetch the full list since server returns { success: true } not the task object
      await fetchTasks();

      setNewTask({ title: "", dueDate: "", priority: "Medium" });
      setShowCreateForm(false);
      onTasksChanged?.();
    } catch {
      setError("Failed to create task");
    } finally {
      setCreating(false);
    }
  }

  async function toggleTask(task: Task, checked: boolean) {
    setSavingIds((prev) => addId(prev, task.id));
    setError(null);

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => t.id === task.id ? { ...t, status: checked ? "Done" : "To Do" } : t)
    );

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, is_completed: checked }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(payload?.error ?? "Failed to update task");
        // Revert optimistic update on error
        setTasks((prev) =>
          prev.map((t) => t.id === task.id ? task : t)
        );
        return;
      }

      if (payload?.task) {
        setTasks((prev) => prev.map((t) => t.id === payload.task.id ? payload.task : t));
      }

      onTasksChanged?.();
    } catch {
      setError("Failed to update task");
      setTasks((prev) => prev.map((t) => t.id === task.id ? task : t));
    } finally {
      setSavingIds((prev) => removeId(prev, task.id));
    }
  }

  async function deleteTask(task: Task) {
    setDeletingIds((prev) => addId(prev, task.id));
    setError(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(payload?.error ?? "Failed to delete task");
        return;
      }

      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      onTasksChanged?.();
    } catch {
      setError("Failed to delete task");
    } finally {
      setDeletingIds((prev) => removeId(prev, task.id));
    }
  }

  function renderSection(title: string, colorClass: string, items: Task[]) {
    if (items.length === 0) return null;

    return (
      <section>
        <h4 className={`text-xs font-semibold tracking-wider mb-3 uppercase ${colorClass}`}>{title}</h4>
        <div className="space-y-3">
          {items.map((task) => {
            const isBusy = savingIds.has(task.id) || deletingIds.has(task.id);

            return (
              <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-[#262626] bg-[#111111]">
                <Checkbox
                  checked={task.status === "Done"}
                  disabled={isBusy}
                  onCheckedChange={(checked) => void toggleTask(task, checked === true)}
                  className="mt-0.5 border-[#404040] data-[state=checked]:bg-[#22c55e] data-[state=checked]:text-[#0A0A0A]"
                />
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2 relative flex-wrap pr-10">
                    <p className="text-sm font-medium leading-none text-[#F5F5F5] truncate">{task.title}</p>
                    <span
                      className={`flex h-2 w-2 rounded-full ${priorityColorMap[task.priority] ?? "bg-[#22c55e]"}`}
                      title={`${task.priority} Priority`}
                    />
                  </div>
                  <p className="text-xs text-[#737373] truncate">{taskMeta(task)}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={isBusy}
                  onClick={() => void deleteTask(task)}
                  className="h-8 w-8 text-[#737373] hover:text-[#ef4444] hover:bg-[#171717]"
                >
                  {deletingIds.has(task.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent showCloseButton={false} className="w-[400px] sm:w-[540px] bg-[#0A0A0A] border-l border-[#262626] text-[#F5F5F5] p-0 flex flex-col">
        <SheetHeader className="p-6 border-b border-[#262626] flex flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-[#F5F5F5]">My Tasks</SheetTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="bg-[#111111] hover:bg-[#171717] text-[#F5F5F5] border border-[#262626]"
            >
              <Plus className="h-4 w-4 mr-1" /> New Task
            </Button>
            <SheetClose className="rounded-sm p-1.5 text-[#737373] hover:text-[#F5F5F5] hover:bg-[#171717] transition-colors">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {showCreateForm && (
            <div className="rounded-lg border border-[#262626] bg-[#111111] p-4 space-y-3">
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Task title"
                className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#737373]"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5]"
                />
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, priority: e.target.value as TaskPriority }))}
                  className="h-9 rounded-md border border-[#262626] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5] outline-none focus:border-[#404040]"
                >
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={creating}
                  onClick={() => setShowCreateForm(false)}
                  className="text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#171717]"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={creating}
                  onClick={() => void createTask()}
                  className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A]"
                >
                  {creating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Add Task
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-2 text-xs text-[#fca5a5]">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-[#737373]">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading tasks...
            </div>
          ) : (
            <>
              {renderSection("Overdue", "text-[#ef4444]", overdueTasks)}
              {renderSection("Today", "text-[#A3A3A3]", todayTasks)}
              {renderSection("Upcoming", "text-[#A3A3A3]", upcomingTasks)}

              {!error && openTasks.length === 0 && (
                <div className="rounded-lg border border-[#262626] bg-[#111111] p-4 text-sm text-[#737373]">
                  No open tasks yet. Create one to get started.
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
