"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { MilestoneSection } from "@/components/milestone-section";
import { ProgressBar } from "@/components/progress-bar";
import { Settings, Plus } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: "TODO" | "DONE";
  assignee: { id: string; name: string | null; image: string | null } | null;
}

interface Milestone {
  id: string;
  name: string;
  progress: number;
  tasks: Task[];
}

interface Member {
  role: string;
  user: { id: string; name: string | null; image: string | null; email: string };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  ownerId: string;
  members: Member[];
  milestones: Milestone[];
}

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-slate-100 text-slate-500",
};

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [milestoneName, setMilestoneName] = useState("");

  const { data: project, isLoading, error } = useQuery<Project>({
    queryKey: ["project", id],
    queryFn: () =>
      fetch(`/api/projects/${id}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load project");
        return r.json();
      }),
    refetchInterval: 10000, // background refresh every 10s
  });

  const addMilestoneMutation = useMutation({
    mutationFn: (name: string) =>
      fetch(`/api/projects/${id}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      setMilestoneName("");
      setAddingMilestone(false);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
        {[1, 2].map((i) => (
          <div key={i} className="h-48 bg-slate-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-24 text-slate-500">
        <p>Project not found or failed to load.</p>
        <Link href="/dashboard" className="text-blue-500 underline text-sm mt-2 block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const totalTasks = project.milestones.reduce(
    (acc, m) => acc + m.tasks.length,
    0
  );
  const doneTasks = project.milestones.reduce(
    (acc, m) => acc + m.tasks.filter((t) => t.status === "DONE").length,
    0
  );

  function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = milestoneName.trim();
    if (trimmed) addMilestoneMutation.mutate(trimmed);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-2xl font-bold text-slate-900 truncate">
              {project.name}
            </h1>
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusStyles[project.status] ?? "bg-slate-100 text-slate-500"}`}
            >
              {project.status.toLowerCase()}
            </span>
          </div>
          {project.description && (
            <p className="text-slate-500 text-sm">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Member avatars */}
          <div className="flex -space-x-2 mr-1">
            {project.members.slice(0, 4).map(({ user }) => (
              <div
                key={user.id}
                className="h-8 w-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600"
                title={`${user.name ?? user.email} (${project.members.find((m) => m.user.id === user.id)?.role.toLowerCase()})`}
              >
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt={user.name ?? ""} className="h-full w-full rounded-full object-cover" />
                ) : (
                  user.name?.[0]?.toUpperCase() ?? "?"
                )}
              </div>
            ))}
          </div>

          <Link href={`/projects/${id}/settings`}>
            <button
              type="button"
              className="flex items-center gap-2 text-sm border rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors text-slate-600"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </Link>
        </div>
      </div>

      {/* Overall progress card */}
      <div className="bg-white border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-700">
            Overall Progress
          </span>
          <span className="text-2xl font-bold text-slate-900">
            {project.progress}%
          </span>
        </div>
        <ProgressBar value={project.progress} size="lg" showLabel={false} />
        <p className="text-xs text-slate-400 mt-2">
          {doneTasks} of {totalTasks} tasks completed
          {project.milestones.length > 0 &&
            ` across ${project.milestones.length} milestone${project.milestones.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Milestones */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-700">Milestones</h2>
        </div>

        {project.milestones.length === 0 && !addingMilestone && (
          <div className="text-center py-12 border rounded-xl bg-white text-slate-400">
            <p className="mb-1">No milestones yet</p>
            <p className="text-sm">Add a milestone to start organizing tasks</p>
          </div>
        )}

        {project.milestones.map((milestone) => (
          <MilestoneSection
            key={milestone.id}
            milestone={milestone}
            projectId={id}
          />
        ))}

        {/* Add milestone */}
        {addingMilestone ? (
          <form onSubmit={handleAddMilestone} className="flex gap-2">
            <input
              value={milestoneName}
              onChange={(e) => setMilestoneName(e.target.value)}
              placeholder="Milestone name..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setAddingMilestone(false);
                  setMilestoneName("");
                }
              }}
            />
            <button
              type="submit"
              disabled={addMilestoneMutation.isPending || !milestoneName.trim()}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingMilestone(false);
                setMilestoneName("");
              }}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAddingMilestone(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Add milestone
          </button>
        )}
      </div>
    </div>
  );
}
