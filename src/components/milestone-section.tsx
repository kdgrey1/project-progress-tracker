"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskItem } from "@/components/task-item";
import { ProgressBar } from "@/components/progress-bar";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: "TODO" | "DONE";
  assignee: { id: string; name: string | null; image: string | null } | null;
}

interface MilestoneSectionProps {
  milestone: {
    id: string;
    name: string;
    progress: number;
    tasks: Task[];
  };
  projectId: string;
}

export function MilestoneSection({ milestone, projectId }: MilestoneSectionProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [addingTask, setAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");

  const addTaskMutation = useMutation({
    mutationFn: (title: string) =>
      fetch(`/api/milestones/${milestone.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setTaskTitle("");
      setAddingTask(false);
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/milestones/${milestone.id}`, { method: "DELETE" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = taskTitle.trim();
    if (trimmed) addTaskMutation.mutate(trimmed);
  }

  const doneCount = milestone.tasks.filter((t) => t.status === "DONE").length;

  return (
    <div className="border rounded-xl bg-white overflow-hidden">
      {/* Milestone header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <h3 className="font-medium text-slate-800 flex-1 min-w-0 truncate">
          {milestone.name}
        </h3>

        <div className="w-32 shrink-0">
          <ProgressBar value={milestone.progress} size="sm" />
        </div>

        <span className="text-xs text-slate-400 shrink-0 tabular-nums">
          {doneCount}/{milestone.tasks.length}
        </span>

        <button
          type="button"
          onClick={() => {
            if (
              milestone.tasks.length === 0 ||
              confirm("Delete this milestone and all its tasks?")
            ) {
              deleteMilestoneMutation.mutate();
            }
          }}
          disabled={deleteMilestoneMutation.isPending}
          className="text-slate-300 hover:text-red-500 transition-colors"
          aria-label="Delete milestone"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Tasks */}
      {expanded && (
        <div className="px-2 py-1">
          {milestone.tasks.length === 0 && !addingTask && (
            <p className="text-sm text-slate-400 text-center py-4">
              No tasks yet — add one below
            </p>
          )}

          {milestone.tasks.map((task) => (
            <TaskItem key={task.id} task={task} projectId={projectId} />
          ))}

          {/* Add task form */}
          {addingTask ? (
            <form onSubmit={handleAddTask} className="flex gap-2 px-3 py-2">
              <input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title..."
                className="flex-1 text-sm border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => e.key === "Escape" && setAddingTask(false)}
              />
              <button
                type="submit"
                disabled={addTaskMutation.isPending || !taskTitle.trim()}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingTask(false);
                  setTaskTitle("");
                }}
                className="px-3 py-1.5 text-sm border rounded hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAddingTask(true)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 px-3 py-2 w-full text-left transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add task
            </button>
          )}
        </div>
      )}
    </div>
  );
}
