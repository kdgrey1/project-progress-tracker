import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateProjectSchema } from "@/lib/validations";
import { computeProgress } from "@/lib/utils";

async function getMembership(projectId: string, userId: string) {
  return db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const membership = await getMembership(id, session.user.id);
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const project = await db.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, image: true, email: true } },
          },
        },
        milestones: {
          orderBy: { order: "asc" },
          include: {
            tasks: {
              orderBy: { order: "asc" },
              include: {
                assignee: { select: { id: true, name: true, image: true } },
              },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const allTasks = project.milestones.flatMap((m) => m.tasks);
    const milestonesWithProgress = project.milestones.map((m) => ({
      ...m,
      progress: computeProgress(m.tasks),
    }));

    return NextResponse.json({
      ...project,
      milestones: milestonesWithProgress,
      progress: computeProgress(allTasks),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const membership = await getMembership(id, session.user.id);
    if (!membership || membership.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const project = await db.project.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const membership = await getMembership(id, session.user.id);
    if (!membership || membership.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
