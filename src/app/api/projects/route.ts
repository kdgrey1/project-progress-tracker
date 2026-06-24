import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createProjectSchema } from "@/lib/validations";
import { computeProgress } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const memberships = await db.projectMember.findMany({
      where: { userId: session.user.id },
      include: {
        project: {
          include: {
            owner: { select: { id: true, name: true, image: true } },
            members: {
              include: { user: { select: { id: true, name: true, image: true } } },
            },
            milestones: {
              include: { tasks: { select: { status: true } } },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const projects = memberships.map(({ project }: (typeof memberships)[number]) => {
      const allTasks = project.milestones.flatMap((m: (typeof project.milestones)[number]) => m.tasks);
      return {
        ...project,
        milestones: undefined, // strip milestones from list view
        progress: computeProgress(allTasks),
      };
    });

    return NextResponse.json(projects);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const project = await db.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        ownerId: session.user.id,
        members: {
          create: { userId: session.user.id, role: "OWNER" },
        },
      },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        members: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
