import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { TopBar } from "@/components/TopBar";
import {
  addIcsSource,
  connectOAuthCalendar,
  removeSource,
  resyncSource,
} from "@/lib/sources";
import { setBookingCalendar } from "@/lib/booking/actions";
import { Footer } from "@/components/Footer";
import { SubmitButton } from "@/components/SubmitButton";

export default async function SourcesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const prisma = await getPrisma();
  const [sources, accounts] = await Promise.all([
    prisma.calendarSource.findMany({
      where: { userId: session.user.id },
      include: { _count: { select: { events: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.account.findMany({ where: { userId: session.user.id } }),
  ]);

  const googleAccounts = accounts.filter((a) => a.provider === "google");
  const microsoftAccounts = accounts.filter(
    (a) => a.provider === "microsoft-entra-id"
  );
  const connectedProviderAccountIds = new Set(
    sources
      .filter((s) => s.providerAccountId)
      .map((s) => s.providerAccountId)
  );

  function accountLabel(account: { email: string | null; providerAccountId: string }): string {
    return account.email ?? `account ending in ${account.providerAccountId.slice(-6)}`;
  }

  const accountsById = new Map(
    accounts.map((a) => [a.providerAccountId, a])
  );
  function hasWriteScope(providerAccountId: string | null): boolean {
    if (!providerAccountId) return false;
    const account = accountsById.get(providerAccountId);
    return Boolean(account?.scope?.includes("ReadWrite"));
  }

  return (
    <>
      <TopBar active="sources" />
      <main className="page">
        <header className="page-head">
          <h1>Sources</h1>
          <p>
            The calendars merged into your one view. For a work calendar you
            don&apos;t administer, use its private ICS feed instead of signing
            in.
          </p>
        </header>

        <section className="split">
          <div className="split-label">
            <h2>Connected calendars</h2>
            <p>Each one keeps its own colour on the calendar.</p>
          </div>
          <div className="panel flush">
          {sources.length === 0 && (
            <p className="empty-small">No calendars connected yet.</p>
          )}
          {sources.map((source) => (
            <div className="item" key={source.id}>
              <div className="item-main">
                <div className="item-title">
                  <span
                    className="dot"
                    style={{ background: source.color, color: source.color }}
                  />
                  {source.label}
                  <span className="chip">{source.type}</span>
                  {source.isBookingTarget && (
                    <span className="chip chip-brand">booking calendar</span>
                  )}
                </div>
                <div className="item-sub">
                  {source._count.events} events ·{" "}
                  {source.lastSyncedAt
                    ? `synced ${source.lastSyncedAt.toLocaleString()}`
                    : "never synced"}
                  {source.lastSyncError && (
                    <span className="error">
                      {" "}
                      · error: {source.lastSyncError}
                    </span>
                  )}
                </div>
              </div>
              <div className="item-actions">
                {source.type === "MICROSOFT" && !source.isBookingTarget && (
                  hasWriteScope(source.providerAccountId) ? (
                    <form
                      action={async () => {
                        "use server";
                        await setBookingCalendar(source.id);
                      }}
                    >
                      <SubmitButton className="btn" pendingLabel="Setting…">
                        Use as booking calendar
                      </SubmitButton>
                    </form>
                  ) : (
                    <span className="muted" style={{ alignSelf: "center" }}>
                      Sign out and back in with Microsoft to grant write
                      access before using this as the booking calendar.
                    </span>
                  )
                )}
                <form
                  action={async () => {
                    "use server";
                    await resyncSource(source.id);
                  }}
                >
                  <SubmitButton className="btn" pendingLabel="Syncing…">
                    Resync
                  </SubmitButton>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await removeSource(source.id);
                  }}
                >
                  <SubmitButton className="btn btn-danger" pendingLabel="Removing…">
                    Remove
                  </SubmitButton>
                </form>
              </div>
            </div>
          ))}
          </div>
        </section>

        <section className="split">
          <div className="split-label">
            <h2>Sign-in accounts</h2>
            <p>
              For calendars you own and sign in to. Grants read access to the
              account&apos;s primary calendar, plus write access for Microsoft
              if you consented at sign-in (needed for a booking calendar). For
              a calendar you can only view, use an ICS feed instead.
            </p>
          </div>
          <div className="panel stack">
          <div className="stack" style={{ gap: 8 }}>
            <h3>Google</h3>
            {googleAccounts.length === 0 && (
              <p className="muted" style={{ margin: 0 }}>No Google accounts connected yet.</p>
            )}
            {googleAccounts.map((account) => {
              const label = `Google Calendar (${accountLabel(account)})`;
              return (
                <div
                  key={account.id}
                  className="row"
                  style={{ gap: 10 }}
                >
                  <span className="muted">{accountLabel(account)}</span>
                  {connectedProviderAccountIds.has(account.providerAccountId) ? (
                    <span className="chip">already added</span>
                  ) : (
                    <form
                      action={async () => {
                        "use server";
                        await connectOAuthCalendar(
                          "google",
                          account.providerAccountId,
                          label
                        );
                      }}
                    >
                      <SubmitButton className="btn btn-primary" pendingLabel="Adding…">
                        Add as calendar source
                      </SubmitButton>
                    </form>
                  )}
                </div>
              );
            })}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- this is a Route Handler that redirects to Google's consent screen, not a Next page */}
            <a href="/api/connect/google" className="btn">
              + Connect another Google account
            </a>
          </div>

          <div className="stack" style={{ gap: 8, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <h3>Microsoft</h3>
            {microsoftAccounts.length === 0 && (
              <p className="muted" style={{ margin: 0 }}>No Microsoft accounts connected yet.</p>
            )}
            {microsoftAccounts.map((account) => {
              const label = `Outlook Calendar (${accountLabel(account)})`;
              return (
                <div
                  key={account.id}
                  className="row"
                  style={{ gap: 10 }}
                >
                  <span className="muted">{accountLabel(account)}</span>
                  {connectedProviderAccountIds.has(account.providerAccountId) ? (
                    <span className="chip">already added</span>
                  ) : (
                    <form
                      action={async () => {
                        "use server";
                        await connectOAuthCalendar(
                          "microsoft-entra-id",
                          account.providerAccountId,
                          label
                        );
                      }}
                    >
                      <SubmitButton className="btn btn-primary" pendingLabel="Adding…">
                        Add as calendar source
                      </SubmitButton>
                    </form>
                  )}
                </div>
              );
            })}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- this is a Route Handler that redirects to Microsoft's consent screen, not a Next page */}
            <a href="/api/connect/microsoft-entra-id" className="btn">
              + Connect another Microsoft account
            </a>
          </div>
          </div>
        </section>

        <section className="split">
          <div className="split-label">
            <h2>Private ICS feed</h2>
            <p>
              Works for any calendar, including a work account you don&apos;t
              administer. You need its private feed URL, not a sign-in.
            </p>
          </div>
          <div className="panel stack">

          <details>
            <summary>Google Calendar</summary>
            <ol className="muted" style={{ paddingLeft: 20, marginTop: 8 }}>
              <li>
                Open{" "}
                <a href="https://calendar.google.com" target="_blank" rel="noreferrer">
                  calendar.google.com
                </a>{" "}
                on a computer (this setting isn&apos;t in the mobile app).
              </li>
              <li>Under &quot;My calendars&quot; on the left, hover over the calendar you want and click the three-dot menu, then &quot;Settings and sharing&quot;.</li>
              <li>Scroll to &quot;Integrate calendar&quot; and copy the <strong>Secret address in iCal format</strong> URL.</li>
            </ol>
            <p className="muted" style={{ marginTop: 4 }}>
              Looks like:{" "}
              <code>https://calendar.google.com/calendar/ical/you%40gmail.com/private-xxxxxxxx/basic.ics</code>
              . Keep this URL private -- anyone who has it can see your event details.
            </p>
          </details>

          <details>
            <summary>Outlook.com (personal Microsoft account)</summary>
            <ol className="muted" style={{ paddingLeft: 20, marginTop: 8 }}>
              <li>
                Open{" "}
                <a href="https://outlook.live.com/calendar" target="_blank" rel="noreferrer">
                  outlook.live.com/calendar
                </a>
                .
              </li>
              <li>Click the gear icon, then &quot;View all Outlook settings&quot; → &quot;Calendar&quot; → &quot;Shared calendars&quot;.</li>
              <li>Under &quot;Publish a calendar&quot;, choose the calendar and set permissions to &quot;Can view all details&quot;, then click Publish.</li>
              <li>Copy the <strong>ICS</strong> link it shows (not the HTML link).</li>
            </ol>
          </details>

          <details>
            <summary>Microsoft 365 / work or school account (Exchange)</summary>
            <ol className="muted" style={{ paddingLeft: 20, marginTop: 8 }}>
              <li>
                Open{" "}
                <a href="https://outlook.office.com/calendar" target="_blank" rel="noreferrer">
                  outlook.office.com/calendar
                </a>
                .
              </li>
              <li>Click the gear icon → &quot;Shared calendars&quot; → &quot;Publish a calendar&quot;.</li>
              <li>Choose the calendar, set permissions to &quot;Can view all details&quot;, click Publish, then copy the <strong>ICS</strong> link.</li>
            </ol>
            <p className="muted" style={{ marginTop: 4 }}>
              Some organizations disable calendar publishing for compliance
              reasons. If you don&apos;t see this option, or Publish is
              greyed out, ask your IT admin to enable &quot;Calendar
              Publishing&quot; (Exchange Online calendar sharing policy) for
              your account, or to send you a direct ICS feed URL if one
              already exists.
            </p>
          </details>

          <form
            action={async (formData: FormData) => {
              "use server";
              await addIcsSource(
                String(formData.get("label") ?? ""),
                String(formData.get("icsUrl") ?? "")
              );
            }}
            className="stack"
          >
            <div className="fields">
              <label className="field">
                Label
                <input type="text" name="label" placeholder="Work" required />
              </label>
              <label className="field wide">
                Feed URL
                <input
                  type="url"
                  name="icsUrl"
                  placeholder="https://.../calendar.ics"
                  required
                />
              </label>
            </div>
            <div>
              <SubmitButton className="btn btn-primary" pendingLabel="Adding…">
                Add feed
              </SubmitButton>
            </div>
          </form>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
