"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Project } from "./project-columns";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { CopyPlus, Calendar, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const COLUMNS = ["Lead", "Planning", "In Progress", "Review", "Completed", "On Hold"] as const;

interface ProjectsKanbanProps {
  initialProjects: Project[];
}

export function ProjectsKanban({ initialProjects }: ProjectsKanbanProps) {
  // We need to locally manage state so optimistic UI drag and drop feels responsive
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as Project["status"];

    // Optimistically update the local state array
    const updatedProjects = projects.map(p => {
      if (p.id === draggableId) {
        return { ...p, status: newStatus };
      }
      return p;
    });

    setProjects(updatedProjects);

    // TODO: We could fire off a server action or Firestore updateDoc here:
    // await updateProjectStatus(draggableId, newStatus);
    console.log(`Updated project ${draggableId} to status ${newStatus}`);
  };

  if (!isMounted) return null; // Avoid hydration mismatch for DND

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)] sm:h-[calc(100vh-220px)] w-full snap-x snap-mandatory pr-4">
      <DragDropContext onDragEnd={onDragEnd}>
        {COLUMNS.map((colId) => {
          const columnProjects = projects.filter((p) => p.status === colId);

          return (
            <div key={colId} className="flex-shrink-0 w-[280px] sm:w-[320px] bg-card rounded-xl border border-border flex flex-col max-h-full snap-center sm:snap-align-none">
              {/* Column Header */}
              <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-accent rounded-t-xl z-10">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{colId}</h3>
                  <Badge variant="secondary" className="bg-accent text-muted-foreground hover:bg-accent border-0">{columnProjects.length}</Badge>
                </div>
                <button className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Add Project">
                  <CopyPlus className="h-4 w-4" />
                </button>
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={colId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-3 overflow-y-auto min-h-[150px] transition-colors ${snapshot.isDraggingOver ? "bg-accent/50" : ""
                      }`}
                  >
                    {columnProjects.map((project, index) => (
                      <Draggable key={project.id} draggableId={project.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-3 p-4 bg-background border rounded-xl shadow-sm cursor-grab active:cursor-grabbing transition-colors ${snapshot.isDragging
                              ? "border-[#818cf8] shadow-md shadow-[#818cf8]/10 bg-card"
                              : "border-border hover:border-muted"
                              }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <Link href={`/dashboard/projects/${project.id}`} className="text-foreground font-medium leading-tight max-w-[85%] hover:text-primary transition-colors">{project.project_name}</Link>
                              <button className="text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground mb-4">{project.service_type}</p>

                            {/* Progress Bar */}
                            <div className="mb-4">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="text-muted-foreground">{project.progress}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-accent rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${project.progress}%` }}></div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>{project.deadline ? format(new Date(project.deadline), "MMM d") : "No date"}</span>
                              </div>

                              {/* Team Avatars Placeholder */}
                              <div className="flex -space-x-2">
                                {project.assigned_team?.slice(0, 3).map((_, i) => (
                                  <div key={i} className="h-6 w-6 rounded-full border-2 border-background bg-accent flex items-center justify-center overflow-hidden">
                                    <div className="h-full w-full bg-gradient-to-br from-[#818cf8] to-[#6366f1] opacity-50" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </DragDropContext>
    </div>
  );
}
