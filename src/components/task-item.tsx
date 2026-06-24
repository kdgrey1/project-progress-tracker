"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Check, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskItemProps {
  task: {
    id: string;
    title: string;
    status: "TODO" | "DONE";
    assignee: { id: string; name: string | null; image: string | null } | null;
  };
  projectId: string;
}

export function TaskItem({ task, projectId }: TaskItemProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  const toggleMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: task.status === "DONE" ? "TODO" : "DONE",
        }),
      }).then((r) => r.json()),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  const editMutation = useMutation({
    mutationFn: (newTitle: string) =>
      fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/tasks/${task.id}`, { method: "DELETE" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  function handleSaveEdit() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) {
      editMutation.mutate(trimmed);
    } else {
      setEditing(false);
      setTitle(task.title);
    }
  }

  return (
    <div className="flex items-center gap-3 group py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
      {/* Checkbox - native button with custom styling */}
      <button
        type="button"
        onClick={() => toggleMutation.mutate()}
        disabled={toggleMutation.isPending}
        className={cn(
          "h-4 w-4 shrink-0 rounded border transition-colors",
          task.status === "DONE"
            ? "bg-blue-500 border-blue-500 flex items-center justify-center"
            : "border-slate-300 hover:border-slate-400"
        )}
        aria-label={task.status === "DONE" ? "Mark as todo" : "Mark as done"}
      >
        {task.status === "DONE" && (
          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
        )}
      </button>

      {/* Title / Edit field */}
      {editing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 text-sm border rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEdit();
              if (e.key === "Escape") {
                setEditing(false);
                setTitle(task.title);
              }
            }}
          />
          <button
            type="button"
            onClick={handleSaveEdit}
            className="p-1 rounded hover:bg-slate-100"
            disabled={editMutation.isPending}
          >
            <Check className="h-3 w-3 text-green-600" />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setTitle(task.title);
            }}
            className="p-1 rounded hover:bg-slate-100"
          >
            <X className="h-3 w-3 text-slate-500" />
          </button>
        </div>
      ) : (
        <span
          className={cn(
            "flex-1 text-sm cursor-pointer select-none",
            task.status === "DONE" && "line-through text-slate-400"
          )}
          onClick={() => setEditing(true)}
          title="Click to edit"
        >
          {task.title}
        </span>
      )}

      {/* Assignee avatar */}
      {task.assignee && !editing && (
        <div
          className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-medium text-slate-600 shrink-0"
          title={task.assignee.name ?? ""}
        >
          {task.assignee.name?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}

      {/* Delete button - only visible on hover */}
      {!editing && (
        <button
          type="button"
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 transition-opacity"
          aria-label="Delete task"
        >
          <Trash2 className="h-3.5 w-3.5 text-red-400 hover:text-red-600" />
        </button>
      )}
    </div>
  );
}
