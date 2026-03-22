import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { user, response } = await getAuthUser();
  if (!user) return response;

  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);

    const sessions = await prisma.pomodoroSession.findMany({
      where: { userId: user.id, startedAt: { gte: start, lt: end }, type: "work", completed: true },
      orderBy: { startedAt: "asc" },
    });

    const totalFocusMinutes = sessions.reduce((acc, s) => acc + s.duration, 0);
    const sessionsByHour: Record<number, number> = {};
    sessions.forEach((s) => {
      const hour = new Date(s.startedAt).getHours();
      sessionsByHour[hour] = (sessionsByHour[hour] || 0) + s.duration;
    });

    const tasksCompleted = await prisma.task.count({
      where: { userId: user.id, status: "done", updatedAt: { gte: start, lt: end } },
    });

    const tasksByStatus = await prisma.task.groupBy({
      by: ["status"],
      where: { userId: user.id },
      _count: true,
    });

    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const daySessions = await prisma.pomodoroSession.findMany({
        where: { userId: user.id, startedAt: { gte: dayStart, lt: dayEnd }, type: "work", completed: true },
      });
      const dayMinutes = daySessions.reduce((acc, s) => acc + s.duration, 0);
      weeklyData.push({
        date: dayStart.toISOString().split("T")[0],
        day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayStart.getDay()],
        minutes: dayMinutes,
        hours: Math.round((dayMinutes / 60) * 10) / 10,
      });
    }

    const peakHours = Array.from({ length: 24 }, (_, i) => ({
      hour: i, label: `${String(i).padStart(2, "0")}:00`, minutes: sessionsByHour[i] || 0,
    }));

    const peakHour = Object.entries(sessionsByHour).sort(([, a], [, b]) => b - a)[0];

    return NextResponse.json({
      totalFocusMinutes,
      totalFocusHours: Math.round((totalFocusMinutes / 60) * 10) / 10,
      sessionsCount: sessions.length,
      tasksCompleted,
      tasksByStatus,
      peakHour: peakHour ? {
        hour: parseInt(peakHour[0]),
        label: `${String(parseInt(peakHour[0])).padStart(2, "0")}:00 - ${String(parseInt(peakHour[0]) + 1).padStart(2, "0")}:00`,
        minutes: peakHour[1],
      } : null,
      weeklyData,
      peakHours,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
