import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { TopBar } from "@/components/TopBar";
import { AvailabilityForm } from "@/components/AvailabilityForm";
import { Footer } from "@/components/Footer";

export default async function AvailabilityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const prisma = await getPrisma();
  const [user, windows] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.availability.findMany({
      where: { userId: session.user.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
  ]);

  const blocksByDay: Record<number, { startTime: string; endTime: string }[]> = {};
  for (const w of windows) {
    (blocksByDay[w.dayOfWeek] ??= []).push({ startTime: w.startTime, endTime: w.endTime });
  }

  const detectedTimezone =
    user?.timezone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone ??
    "UTC";

  return (
    <>
      <TopBar active="availability" />
      <main className="page">
        <header className="page-head">
          <h1>Availability</h1>
          <p>
            The weekly hours people can book you. Times are in your timezone;
            the booking page converts to the booker&apos;s automatically.
          </p>
        </header>

        <AvailabilityForm
          initialTimezone={detectedTimezone}
          initialBlocksByDay={blocksByDay}
        />
      </main>
      <Footer />
    </>
  );
}
