"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/progress-bar";
import { Calendar } from "lucide-react";

type Member = {
  user: { id: string; name: string | null; image: string | null };
};

interface ProjectCardProps {
  id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  members: Member[];
  createdAt: string;
}

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-700 border-blue-200",
  COMPLETED: "bg-green-100 text-green-700 border-green-200",
  ARCHIVED: "bg-slate-100 text-slate-600 border-slate-200",
};

export function ProjectCard({
  id,
  name,
  description,
  status,
  progress,
  members,
  createdAt,
}: ProjectCardProps) {
  return (
    <Link href={`/projects/${id}`} className="block h-full">
      <div className="h-full border rounded-xl bg-white p-5 hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900 line-clamp-2 flex-1">{name}</h3>
          <span
            className={cn(
              "shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border",
              statusStyles[status] ?? "bg-slate-100 text-slate-600 border-slate-200"
            )}
          >
            {status.toLowerCase()}
          </span>
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-slate-500 line-clamp-2 -mt-2">{description}</p>
        )}

        {/* Progress */}
        <ProgressBar value={progress} size="md" />

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto">
          {/* Member avatars */}
          <div className="flex -space-x-2">
            {members.slice(0, 4).map(({ user }) => {
              const initials =
                user.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() ?? "?";
              return (
                <div
                  key={user.id}
                  className="h-7 w-7 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600 overflow-hidden"
                  title={user.name ?? ""}
                >
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image}
                      alt={user.name ?? ""}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
              );
            })}
            {members.length > 4 && (
              <div className="h-7 w-7 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                +{members.length - 4}
              </div>
            )}
          </div>

          {/* Date */}
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="h-3 w-3" />
            {new Date(createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </Link>
  );
}
