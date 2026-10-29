import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";

const ACTION_LABELS: Record<string, string> = {
  BOOKING_CREATED: "Booked",
  BOOKING_CANCELLED: "Cancelled",
  BOOKING_RESCHEDULED: "Rescheduled",
  SIGN_IN: "Signed in",
};

export default async function ActivityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const prisma = await getPrisma();
  const logs = await prisma.auditLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <>
      <TopBar active="activity" />
      <main className="page">
        <header className="page-head">
          <h1>Activity</h1>
          <p>Every booking created, rescheduled or cancelled.</p>
        </header>

        <div className="panel flush">
          {logs.length === 0 ? (
            <p className="empty-small">No activity yet. Bookings will show up here.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="item">
                <div className="item-main">
                  <div className="item-title">
                    <span
                      className={`chip ${log.action === "BOOKING_CANCELLED" ? "chip-danger" : "chip-brand"}`}
                    >
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                    {log.actorEmail}
                  </div>
                  {log.detail && <div className="item-sub">{log.detail}</div>}
                </div>
                <time className="muted" dateTime={log.createdAt.toISOString()}>
                  {log.createdAt.toLocaleString()}
                </time>
              </div>
            ))
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
