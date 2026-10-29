import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { ensureUsername } from "@/lib/username";
import { TopBar } from "@/components/TopBar";
import { UsernameForm } from "@/components/UsernameForm";
import { BrandingForm } from "@/components/BrandingForm";
import { Footer } from "@/components/Footer";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const prisma = await getPrisma();
  const username = await ensureUsername(prisma, session.user.id);
  const branding = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { logoKey: true, accentColor: true },
  });

  return (
    <>
      <TopBar active="settings" />
      <main className="page">
        <header className="page-head">
          <h1>Settings</h1>
          <p>
            Your username is part of every booking link you share:{" "}
            <code>/book/{username}/&lt;event&gt;</code>
          </p>
        </header>

        <section className="split">
          <div className="split-label">
            <h2>Username</h2>
            <p>Changing it changes your public links.</p>
          </div>
          <div className="panel">
            <UsernameForm initialUsername={username} />
          </div>
        </section>

        <section className="split">
          <div className="split-label">
            <h2>Branding</h2>
            <p>Shown on your public profile and booking pages.</p>
          </div>
          <div className="panel">
            <BrandingForm
              username={username}
              initialAccentColor={branding.accentColor ?? "#ff5a1f"}
              hasLogo={Boolean(branding.logoKey)}
            />
          </div>
        </section>

        <section className="split">
          <div className="split-label">
            <h2>Hours &amp; timezone</h2>
          </div>
          <div className="panel">
            <p className="muted" style={{ margin: 0 }}>
              Set your weekly hours and timezone on the{" "}
              <Link href="/availability">Availability</Link> page.
            </p>
          </div>
        </section>

        <section className="split">
          <div className="split-label">
            <h2>Public profile</h2>
          </div>
          <div className="panel">
            <p className="muted" style={{ margin: 0 }}>
              One link for all your event types:{" "}
              <Link href={`/u/${username}`}>/u/{username}</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
