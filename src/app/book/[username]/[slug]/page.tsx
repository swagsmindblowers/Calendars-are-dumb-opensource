import { notFound } from "next/navigation";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { BookingForm } from "./BookingForm";
import { Footer } from "@/components/Footer";

export default async function BookPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const prisma = await getPrisma();
  const eventType = await prisma.eventType.findFirst({
    where: { slug, active: true, user: { username } },
    include: { user: { select: { logoKey: true, accentColor: true } } },
  });
  if (!eventType) notFound();

  const accentStyle = {
    ...(eventType.user.accentColor ? { "--accent": eventType.user.accentColor } : {}),
  } as React.CSSProperties;

  return (
    <>
    <div className="public" style={accentStyle}>
      <div className="public-brandbar">
        {eventType.user.logoKey ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo lives in R2, not Next's image pipeline
          <img src={`/api/logo/${username}`} alt="Logo" />
        ) : (
          <span style={{ fontWeight: 800, letterSpacing: "-0.03em" }}>{username}</span>
        )}
        <Link href={`/u/${username}`} className="brand-link">
          All meeting types
        </Link>
      </div>
      <div className="booking-grid">
        <div className="booking-side">
          <div className="duration" style={{ width: 64, height: 64 }}>
            <strong>{eventType.durationMinutes}</strong>
            <span>min</span>
          </div>
          <h1>{eventType.name}</h1>
          {eventType.description && (
            <p className="muted" style={{ margin: 0, fontSize: "var(--t-base)" }}>
              {eventType.description}
            </p>
          )}
        </div>
        <div className="booking-main">
          <BookingForm
            username={username}
            slug={eventType.slug}
            durationMinutes={eventType.durationMinutes}
          />
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}
