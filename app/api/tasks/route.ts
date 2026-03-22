import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const { user, response } = await getAuthUser();
  if (!user) return response;

  try {
    const tasks = await prisma.task.findMany({
      where: { userId: user.id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, response } = await getAuthUser();
  if (!user) return response;

  try {
    const body = await req.json();
    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title: body.title,
        description: body.description,
        status: body.status || "todo",
        tags: body.tags || [],
        priority: body.priority || "medium",
        order: body.order || 0,
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
