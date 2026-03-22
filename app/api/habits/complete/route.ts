import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { habitId, date } = body;

    // Toggle: if exists, delete; if not, create
    const existing = await prisma.habitCompletion.findUnique({
      where: { habitId_date: { habitId, date } },
    });

    if (existing) {
      await prisma.habitCompletion.delete({
        where: { habitId_date: { habitId, date } },
      });
      return NextResponse.json({ toggled: false });
    } else {
      const completion = await prisma.habitCompletion.create({
        data: { habitId, date },
      });
      return NextResponse.json({ toggled: true, completion });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to toggle habit" }, { status: 500 });
  }
}
