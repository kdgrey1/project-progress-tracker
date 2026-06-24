import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTaskSchema } from "@/lib/validations";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: milestoneId } = await params;

  try {
    const milestone = await db.milestone.findUnique({ where: { id: milestoneId } });
    if (!milestone) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const member = await db.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: milestone.projectId, userId: session.user.id },
      },
    });
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const count = await db.task.count({ where: { milestoneId } });
    const task = await db.task.create({
      data: { ...parsed.data, milestoneId, order: count },
      include: {
        assignee: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
