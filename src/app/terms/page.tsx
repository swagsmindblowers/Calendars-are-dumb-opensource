import Link from "next/link";
import { Footer } from "@/components/Footer";
import { getSite } from "@/lib/site";

// Reads APP_URL / CONTACT_EMAIL at request time (see lib/site.ts).
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Terms of service — Calendars are dumb",
};

export default function TermsPage() {
  const site = getSite();
  return (
    <>
      <div className="public">
        <div className="public-brandbar">
          <Link href="/" className="brand-link">
            ← Calendars are dumb
          </Link>
        </div>
        <div className="prose stack">
          <div>
            <h1 style={{ fontSize: "var(--t-2xl)" }}>Terms of service</h1>
            <p className="muted">
              Last updated October 28, 2026.
              By using {site.host} (&quot;Calendars are dumb&quot;), you agree
              to these terms.
            </p>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <h2>What this is</h2>
            <p className="muted">
              Calendars are dumb merges your connected calendars (Google,
              Microsoft, or any private ICS feed) into one view, and lets you
              offer a public booking page so other people can schedule time
              with you. A confirmed booking may create a real calendar event
              -- and, where configured, a Microsoft Teams meeting -- on your
              connected calendar.
            </p>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <h2>Your account and connected calendars</h2>
            <p className="muted">
              You&apos;re responsible for the accounts you connect and for
              keeping your sign-in secure. You can disconnect a calendar
              account or remove an ICS feed at any time from the Sources
              page. We only access what&apos;s needed to sync events, compute
              availability, and create bookings -- see the{" "}
              <a href="/privacy">privacy policy</a> for exactly what&apos;s
              collected.
            </p>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <h2>Bookings</h2>
            <p className="muted">
              Anyone with your booking link can book a slot you&apos;ve marked
              available, without creating an account. A booker can cancel or
              reschedule their own booking using the link in their
              confirmation email. We send that confirmation on a best-effort
              basis -- always double-check your own calendar for the final
              word on what&apos;s actually scheduled.
            </p>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <h2>Acceptable use</h2>
            <p className="muted">
              Don&apos;t use the service to send spam, harass people through
              the booking form, abuse the booking or sync endpoints (e.g.
              automated scraping or flooding), or try to access another
              user&apos;s calendars or bookings. We may suspend or remove
              access for accounts that do.
            </p>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <h2>No warranty</h2>
            <p className="muted">
              This is provided as-is, with no guarantee it will be
              uninterrupted, error-free, or fit for any particular purpose.
              Calendar sync and meeting creation depend on third-party
              services (Google, Microsoft) that are outside our control and
              can occasionally fail or be delayed.
            </p>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <h2>Limitation of liability</h2>
            <p className="muted">
              To the fullest extent permitted by law, we&apos;re not liable
              for indirect, incidental, or consequential damages arising from
              your use of the service, including a missed or double-booked
              meeting, a failed sync, or a calendar event that wasn&apos;t
              created as expected.
            </p>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <h2>Changes</h2>
            <p className="muted">
              We may update these terms as the product changes. Continuing to
              use the service after an update means you accept the revised
              terms.
            </p>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <h2>Contact</h2>
            <p className="muted">
              Questions about these terms:{" "}
              {site.contactEmail ? (
                <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
              ) : (
                "contact the operator of this site."
              )}
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
