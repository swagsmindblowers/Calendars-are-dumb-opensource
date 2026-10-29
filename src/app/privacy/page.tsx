import Link from "next/link";
import { Footer } from "@/components/Footer";
import { getSite } from "@/lib/site";

// Reads APP_URL / CONTACT_EMAIL at request time (see lib/site.ts).
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Privacy & cookies — Calendars are dumb",
};

export default function PrivacyPage() {
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
            <h1 style={{ fontSize: "var(--t-2xl)" }}>Privacy &amp; cookies</h1>
            <p className="muted">
              Last updated October 28, 2026.
              This page covers both our privacy practices and our cookie use
              for {site.host} (&quot;Calendars are dumb&quot;).
            </p>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <h2>What we collect</h2>
            <ul className="muted" style={{ paddingLeft: 20, margin: 0 }}>
              <li>
                <strong>Calendar access tokens</strong> for any Google or
                Microsoft account you connect, so we can read (and, for a
                booking calendar, write) your calendar. Tokens are encrypted
                at rest.
              </li>
              <li>
                <strong>Calendar event details</strong> synced from the
                Google, Microsoft, or ICS calendars you connect, so we can
                show them in your unified view.
              </li>
              <li>
                <strong>Booking details</strong> (name, email, timezone, and
                any notes) from anyone who books time with you through your
                public booking page -- they don&apos;t need an account to do
                this.
              </li>
              <li>
                <strong>Activity history</strong> of bookings created,
                cancelled, or rescheduled, so you have a record of changes.
              </li>
              <li>
                <strong>Branding</strong> you choose to add -- an uploaded
                logo image and an accent color -- and your chosen username.
              </li>
            </ul>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <h2>How we use it</h2>
            <p className="muted">
              Solely to run the product: merging your connected calendars
              into one view, computing your available booking slots, creating
              the actual calendar event (and Microsoft Teams meeting, where
              applicable) when someone books you, and sending booking
              confirmation emails. We don&apos;t sell your data or use it for
              advertising.
            </p>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <h2>Where it&apos;s processed</h2>
            <p className="muted">
              The app runs on Cloudflare&apos;s global network (Workers and
              D1), so data is processed and stored on Cloudflare&apos;s
              infrastructure rather than a single fixed server.
            </p>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <h2>Third parties</h2>
            <p className="muted">
              We only share data with the services needed to run the
              features you use: Google and Microsoft (for calendar sync and
              OAuth sign-in), Cloudflare (hosting, database, and file
              storage), and Resend (sending booking confirmation emails). We
              don&apos;t use any analytics or advertising services.
            </p>
          </div>

          <div className="stack" style={{ gap: 8 }} id="cookies">
            <h2>Cookies</h2>
            <p className="muted">
              We only set the cookies needed to keep you signed in -- no
              analytics, advertising, or tracking cookies, so no cookie
              banner is needed:
            </p>
            <ul className="muted" style={{ paddingLeft: 20, margin: 0 }}>
              <li>
                <code className="mono">authjs.session-token</code> -- keeps
                you signed in (essential).
              </li>
              <li>
                <code className="mono">authjs.csrf-token</code> -- protects
                sign-in from cross-site request forgery (essential).
              </li>
              <li>
                <code className="mono">authjs.callback-url</code> -- remembers
                where to send you back to after signing in (essential).
              </li>
            </ul>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <h2>Your choices</h2>
            <p className="muted">
              You can disconnect a calendar account or ICS feed at any time
              from the Sources page, which stops future syncing. To have your
              account and its data deleted entirely, contact us below.
            </p>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <h2>Contact</h2>
            <p className="muted">
              Questions, data requests, or anything else:{" "}
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
