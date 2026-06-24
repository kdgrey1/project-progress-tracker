"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { ArrowLeft, Trash2, UserMinus, UserPlus } from "lucide-react";
import Link from "next/link";

interface Member {
  role: string;
  user: { id: string; name: string | null; image: string | null; email: string };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  ownerId: string;
  members: Member[];
}

export default function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["project", id],
    queryFn: () =>
      fetch(`/api/projects/${id}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      }),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync form state when project loads
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description ?? "");
      setStatus(project.status);
    }
  }, [project]);

  const isOwner = project?.ownerId === session?.user?.id;

  const updateMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          description: description.trim() || undefined,
          status,
        }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) =>
      fetch(`/api/projects/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) {
        setInviteError(data.error);
        return;
      }
      setInviteEmail("");
      setInviteError("");
      setInviteSuccess("Member added!");
      setTimeout(() => setInviteSuccess(""), 2000);
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      fetch(`/api/projects/${id}/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", id] }),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push("/dashboard");
    },
  });

  if (isLoading || !project) {
    return (
      <div className="max-w-2xl space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-slate-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        href={`/projects/${id}`}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to project
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">Project Settings</h1>

      {/* Project details */}
      <section className="bg-white border rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Details</h2>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="proj-name">
            Project name
          </label>
          <input
            id="proj-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={!isOwner}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="proj-desc">
            Description
          </label>
          <input
            id="proj-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={!isOwner}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="proj-status">
            Status
          </label>
          <select
            id="proj-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            disabled={!isOwner}
          >
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || !name.trim()}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {updateMutation.isPending
              ? "Saving..."
              : saveSuccess
              ? "Saved!"
              : "Save changes"}
          </button>
        )}
      </section>

      {/* Team members */}
      <section className="bg-white border rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Team</h2>

        <div className="space-y-3">
          {project.members.map(({ role, user }) => (
            <div key={user.id} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600 shrink-0">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={user.name ?? ""}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  user.name?.[0]?.toUpperCase() ?? "?"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {user.name ?? user.email}
                </p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                {role.toLowerCase()}
              </span>
              {isOwner && user.id !== session?.user?.id && (
                <button
                  type="button"
                  onClick={() => removeMemberMutation.mutate(user.id)}
                  disabled={removeMemberMutation.isPending}
                  className="text-slate-300 hover:text-red-500 transition-colors"
                  title="Remove member"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {isOwner && (
          <div className="space-y-2 pt-2 border-t">
            <label className="text-sm font-medium text-slate-700">
              Invite by email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteError("");
                }}
                placeholder="teammate@example.com"
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inviteEmail.trim()) {
                    inviteMutation.mutate(inviteEmail.trim());
                  }
                }}
              />
              <button
                type="button"
                onClick={() => inviteMutation.mutate(inviteEmail.trim())}
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
                className="px-3 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Invite
              </button>
            </div>
            {inviteError && (
              <p className="text-sm text-red-500">{inviteError}</p>
            )}
            {inviteSuccess && (
              <p className="text-sm text-green-600">{inviteSuccess}</p>
            )}
          </div>
        )}
      </section>

      {/* Danger zone — owner only */}
      {isOwner && (
        <section className="border border-red-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-red-600 mb-3">
            Danger zone
          </h2>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-800">
                Delete this project
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Permanently deletes the project, all milestones, and all tasks.
                This cannot be undone.
              </p>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 shrink-0 transition-colors"
              onClick={() => {
                if (
                  confirm(
                    `Delete "${project.name}"? This will permanently delete all milestones and tasks.`
                  )
                ) {
                  deleteProjectMutation.mutate();
                }
              }}
              disabled={deleteProjectMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              Delete project
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
