import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/booking/availability";
import { checkRateLimit } from "@/lib/rateLimit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string; slug: string }> }
) {
  if (!(await checkRateLimit("BOOKING_READ_LIMITER"))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { username, slug } = await params;
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const excludeBookingId = searchParams.get("excludeBookingId") ?? undefined;
  if (!date) {
    return NextResponse.json({ error: "Missing date" }, { status: 400 });
  }

  const prisma = await getPrisma();
  const eventType = await prisma.eventType.findFirst({
    where: { slug, active: true, user: { username } },
  });
  if (!eventType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const slots = await getAvailableSlots(eventType.id, date, { excludeBookingId });
  return NextResponse.json(
    slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() }))
  );
}
