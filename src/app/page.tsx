import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { TopBar } from "@/components/TopBar";
import { UnifiedCalendar } from "@/components/UnifiedCalendar";
import { FoxMascot } from "@/components/FoxMascot";
import { Footer } from "@/components/Footer";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const prisma = await getPrisma();
  const sourceCount = await prisma.calendarSource.count({
    where: { userId: session.user.id },
  });

  return (
    <>
      <TopBar active="calendar" />
      <main className="page">
        {sourceCount === 0 ? (
          <div className="empty">
            <FoxMascot corner="inline" size={110} rotate={-4} message="start here" />
            <div style={{ flex: "1 1 280px" }}>
              <h2>Nothing to show yet</h2>
              <p>
                Connect Google, Outlook, or a private ICS feed for a calendar
                you don&apos;t administer, and every event lands here.
              </p>
              <Link href="/sources" className="btn btn-primary">
                Connect a calendar
              </Link>
            </div>
          </div>
        ) : (
          <UnifiedCalendar />
        )}
      </main>
      <Footer />
    </>
  );
}
