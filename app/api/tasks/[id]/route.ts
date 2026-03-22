import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await getAuthUser();
  if (!user) return response;

  try {
    const { id } = await context.params; // await params ก่อนใช้
    const body = await req.json();

    const existing = await prisma.task.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.order !== undefined && { order: body.order }),
        ...(body.totalTime !== undefined && { totalTime: body.totalTime }),
      },
    });
    return NextResponse.json(task);
  } catch (error) {
    console.error("PATCH ERROR:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await getAuthUser();
  if (!user) return response;

  try {
    const { id } = await context.params; // await params ก่อนใช้

    const existing = await prisma.task.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE ERROR:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
