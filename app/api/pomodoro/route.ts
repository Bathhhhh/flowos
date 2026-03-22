import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { user, response } = await getAuthUser();
  if (!user) return response;

  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    let where: Record<string, unknown> = { userId: user.id };
    if (date) {
      // แปลงวันที่ให้ครอบคลุม timezone ไทย (UTC+7)
      // ใช้ timezone offset เพื่อให้ได้ช่วงเวลาที่ถูกต้อง
      const start = new Date(`${date}T00:00:00+07:00`);
      const end = new Date(`${date}T23:59:59+07:00`);
      where = { ...where, startedAt: { gte: start, lte: end } };
    }
    const sessions = await prisma.pomodoroSession.findMany({
      where, orderBy: { startedAt: "desc" },
      include: { task: { select: { id: true, title: true } } },
    });
    return NextResponse.json(sessions);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, response } = await getAuthUser();
  if (!user) return response;

  try {
    const body = await req.json();
    const session = await prisma.pomodoroSession.create({
      data: {
        userId: user.id,
        taskId: body.taskId || null,
        duration: body.duration,
        type: body.type || "work",
        startedAt: new Date(body.startedAt),
        endedAt: body.endedAt ? new Date(body.endedAt) : null,
        completed: body.completed || false,
      },
    });
    if (body.taskId && body.type === "work" && body.completed) {
      await prisma.task.updateMany({
        where: { id: body.taskId, userId: user.id },
        data: { totalTime: { increment: body.duration } },
      });
    }
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { user, response } = await getAuthUser();
  if (!user) return response;

  try {
    const body = await req.json();
    const session = await prisma.pomodoroSession.findFirst({
      where: { id: body.id, userId: user.id },
    });
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.pomodoroSession.update({
      where: { id: body.id },
      data: {
        endedAt: body.endedAt ? new Date(body.endedAt) : undefined,
        completed: body.completed,
      },
    });
    if (updated.taskId && updated.type === "work" && body.completed) {
      await prisma.task.updateMany({
        where: { id: updated.taskId, userId: user.id },
        data: { totalTime: { increment: updated.duration } },
      });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}
