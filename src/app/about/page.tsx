import Link from "next/link";
import { Footer } from "@/components/Footer";

// Reads APP_URL / CONTACT_EMAIL at request time (see lib/site.ts).
export const dynamic = "force-dynamic";

export const metadata = {
  title: "About — Calendars are dumb",
};

export default function AboutPage() {
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
            <h1 style={{ fontSize: "var(--t-2xl)" }}>Why this exists</h1>
            <p className="muted">
              Most people aren&apos;t juggling one calendar. They&apos;re
              juggling two or three -- a personal Google account, a work
              Microsoft 365 or Exchange calendar, maybe a shared team
              calendar nobody gave them admin rights to. None of those
              calendars talk to each other, which is how double-bookings
              happen and why scheduling anything takes six messages back
              and forth.
            </p>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <h2>Who it&apos;s for</h2>
            <p className="muted">
              Freelancers, consultants, and small-business owners who need
              one real picture of their time and one link they can send
              people to book it -- without paying for an enterprise
              scheduling platform or needing admin access to every
              calendar involved. If you&apos;ve ever double-booked
              yourself because your &quot;scheduling tool&quot; only ever
              checked one calendar, this is for you.
            </p>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <h2>Why it&apos;s necessary</h2>
            <ul className="muted" style={{ paddingLeft: 20, margin: 0 }}>
              <li>
                <strong>Most booking tools check one calendar.</strong>{" "}
                Calendars are dumb merges every calendar you connect --
                Google, Microsoft, or any private ICS feed -- into one
                availability picture, so a booking link actually reflects
                everywhere you might already be busy.
              </li>
              <li>
                <strong>You don&apos;t always have admin rights.</strong>{" "}
                A shared work or client calendar you can only view, not
                sign in to, still works here: add it as a private ICS
                feed and it blocks time just like any other source.
              </li>
              <li>
                <strong>
                  A booking shouldn&apos;t mean manual work afterward.
                </strong>{" "}
                A confirmed booking creates a real calendar event -- and,
                on a connected Microsoft account, a real Teams meeting
                with a join link -- automatically, not a task for you to
                go do later.
              </li>
            </ul>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <h2>How it works</h2>
            <p className="muted">
              Connect the calendars you want merged (sign in directly, or
              add a private feed URL for one you don&apos;t administer).
              Set your weekly availability once. Share one booking link
              for each type of meeting you take. When someone books a
              slot, it&apos;s checked against every connected calendar at
              once, the event is created for you, and everyone gets a
              confirmation.
            </p>
          </div>

          <div>
            <Link href="/signin" className="btn btn-primary">
              Connect your calendars
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
