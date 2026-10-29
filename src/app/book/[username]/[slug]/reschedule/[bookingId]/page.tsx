import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { RescheduleForm } from "./RescheduleForm";
import { Footer } from "@/components/Footer";

export default async function RescheduleBookingPage({
  params,
}: {
  params: Promise<{ username: string; slug: string; bookingId: string }>;
}) {
  const { username, slug, bookingId } = await params;
  const prisma = await getPrisma();
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { eventType: true },
  });
  if (!booking) notFound();

  return (
    <>
    <div className="public">
      <div className="panel stack" style={{ maxWidth: 560, margin: "0 auto", boxShadow: "var(--shadow-hard)" }}>
        {booking.status === "CANCELLED" ? (
          <p>This booking has been cancelled and can&apos;t be rescheduled.</p>
        ) : (
          <>
            <div>
              <h1 style={{ margin: 0, fontSize: "var(--t-xl)" }}>Reschedule</h1>
              <p className="muted">
                {booking.eventType.name} · currently{" "}
                {booking.start.toLocaleString(undefined, {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <RescheduleForm username={username} slug={slug} bookingId={bookingId} />
          </>
        )}
      </div>
    </div>
    <Footer />
    </>
  );
}
