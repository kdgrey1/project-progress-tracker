"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/project-card";
import { Plus, FolderOpen } from "lucide-react";

interface ProjectMember {
  user: { id: string; name: string | null; image: string | null };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  createdAt: string;
  members: ProjectMember[];
}

export default function DashboardPage() {
  const { data: projects, isLoading, error } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () =>
      fetch("/api/projects").then((r) => {
        if (!r.ok) throw new Error("Failed to load projects");
        return r.json();
      }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-9 w-32 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-24 text-slate-500">
        <p>Failed to load projects. Please refresh the page.</p>
      </div>
    );
  }

  if (!projects?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <FolderOpen className="h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">No projects yet</h2>
        <p className="text-slate-500 mb-6">
          Create your first project to start tracking progress
        </p>
        <Link href="/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create project
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
        <Link href="/projects/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <ProjectCard key={project.id} {...project} />
        ))}
      </div>
    </div>
  );
}
