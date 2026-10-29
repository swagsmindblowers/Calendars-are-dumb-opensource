import { notFound } from "next/navigation";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { cancelBooking } from "@/lib/booking/actions";
import { Footer } from "@/components/Footer";
import { SubmitButton } from "@/components/SubmitButton";

export default async function CancelBookingPage({
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
          <p>This booking has already been cancelled.</p>
        ) : (
          <>
            <h1 style={{ margin: 0, fontSize: "var(--t-xl)" }}>Cancel this booking?</h1>
            <p className="muted">
              {booking.eventType.name} ·{" "}
              {booking.start.toLocaleString(undefined, {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </p>
            <div className="row" style={{ gap: 8 }}>
              <form
                action={async () => {
                  "use server";
                  await cancelBooking(bookingId);
                }}
              >
                <SubmitButton className="btn btn-danger" pendingLabel="Cancelling…">
                  Cancel booking
                </SubmitButton>
              </form>
              <Link href={`/book/${username}/${slug}/reschedule/${bookingId}`} className="btn">
                Reschedule instead
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
    <Footer />
    </>
  );
}
