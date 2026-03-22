import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const { user, response } = await getAuthUser();
  if (!user) return response;

  try {
    const habits = await prisma.habit.findMany({
      where: { userId: user.id },
      orderBy: { order: "asc" },
      include: { completions: { orderBy: { date: "desc" }, take: 365 } },
    });
    return NextResponse.json(habits);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch habits" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, response } = await getAuthUser();
  if (!user) return response;

  try {
    const body = await req.json();
    const habit = await prisma.habit.create({
      data: { userId: user.id, name: body.name, icon: body.icon || "⭐", color: body.color || "#6366f1", order: body.order || 0 },
      include: { completions: true },
    });
    return NextResponse.json(habit, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create habit" }, { status: 500 });
  }
}
