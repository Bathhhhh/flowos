import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, response } = await getAuthUser();
  if (!user) return response;

  try {
    await prisma.habit.deleteMany({ where: { id: params.id, userId: user.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete habit" }, { status: 500 });
  }
}
