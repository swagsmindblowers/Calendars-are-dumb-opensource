import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const prisma = await getPrisma();
  const events = await prisma.event.findMany({
    where: {
      source: { userId: session.user.id },
      ...(start && end
        ? { start: { lt: new Date(end) }, end: { gt: new Date(start) } }
        : {}),
    },
    include: { source: { select: { label: true, color: true, type: true } } },
    orderBy: { start: "asc" },
  });

  return NextResponse.json(
    events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      allDay: event.allDay,
      backgroundColor: event.source.color,
      borderColor: event.source.color,
      extendedProps: {
        location: event.location,
        description: event.description,
        sourceLabel: event.source.label,
      },
    }))
  );
}
