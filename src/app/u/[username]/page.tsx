import { notFound } from "next/navigation";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { Footer } from "@/components/Footer";
import { getSite } from "@/lib/site";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const prisma = await getPrisma();
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      eventTypes: {
        where: { active: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user) notFound();

  const accentStyle = {
    ...(user.accentColor ? { "--accent": user.accentColor } : {}),
  } as React.CSSProperties;

  return (
    <>
    <div className="public" style={accentStyle}>
      <div className="public-brandbar">
        {user.logoKey ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo lives in R2, not Next's image pipeline
          <img
            src={`/api/logo/${username}`}
            alt={`${user.name ?? username} logo`}
          />
        ) : (
          <span style={{ fontWeight: 800, letterSpacing: "-0.03em" }}>
            {user.name ?? username}
          </span>
        )}
        <span className="muted">{getSite().host}/u/{username}</span>
      </div>

      <div className="stack" style={{ gap: 36 }}>
        <div className="profile-hero">
          <h1>{user.name ?? username}</h1>
          <p style={{ margin: 0, fontSize: "var(--t-md)", color: "var(--muted)" }}>
            Pick a meeting type to see open times.
          </p>
        </div>
        {user.eventTypes.length === 0 ? (
          <p className="empty-small" style={{ padding: 0 }}>
            No meeting types available yet.
          </p>
        ) : (
          <div className="event-list">
            {user.eventTypes.map((et) => (
              <Link
                key={et.id}
                href={`/book/${username}/${et.slug}`}
                className="event-tile"
              >
                <div className="duration" aria-label={`${et.durationMinutes} minutes`}>
                  <strong>{et.durationMinutes}</strong>
                  <span>min</span>
                </div>
                <div className="event-tile-body">
                  <strong>{et.name}</strong>
                  {et.description && <div className="muted">{et.description}</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
    <Footer />
    </>
  );
}
