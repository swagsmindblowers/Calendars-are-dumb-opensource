import Link from "next/link";
import { signOut } from "@/auth";
import { SubmitButton } from "./SubmitButton";

type ActivePage =
  | "calendar"
  | "sources"
  | "event-types"
  | "availability"
  | "activity"
  | "settings";

const ICONS: Record<ActivePage, string> = {
  "calendar": '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  "sources": '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  "event-types": '<path d="M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z"/><path d="M14 5v14" stroke-dasharray="2 3"/>',
  "availability": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  "activity": '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  "settings": '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
};

function Icon({ name }: { name: ActivePage }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}

function FoxMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 3l6 3.5h6L21 3v9c0 5-4 9-9 9s-9-4-9-9z"
        fill="#fff"
        stroke="#11131c"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="12" r="1.4" fill="#11131c" />
      <circle cx="15" cy="12" r="1.4" fill="#11131c" />
    </svg>
  );
}

export function TopBar({ active }: { active: ActivePage }) {
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            <FoxMark />
          </span>
          Calendars
          <br />
          are dumb
        </Link>
        <input type="checkbox" id="nav-toggle" className="nav-toggle" />
        <label htmlFor="nav-toggle" className="nav-toggle-label" aria-label="Toggle menu">
          <span aria-hidden="true">&#9776;</span>
        </label>
        <nav className="nav-links">
          <Link href="/" className={active === "calendar" ? "active" : ""}>
            <Icon name="calendar" />
            Calendar
          </Link>
          <Link href="/sources" className={active === "sources" ? "active" : ""}>
            <Icon name="sources" />
            Sources
          </Link>
          <Link
            href="/event-types"
            className={active === "event-types" ? "active" : ""}
          >
            <Icon name="event-types" />
            Event types
          </Link>
          <Link
            href="/availability"
            className={active === "availability" ? "active" : ""}
          >
            <Icon name="availability" />
            Availability
          </Link>
          <Link href="/activity" className={active === "activity" ? "active" : ""}>
            <Icon name="activity" />
            Activity
          </Link>
          <Link href="/settings" className={active === "settings" ? "active" : ""}>
            <Icon name="settings" />
            Settings
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/signin" });
            }}
          >
            <SubmitButton className="btn" pendingLabel="Signing out…">
              Sign out
            </SubmitButton>
          </form>
        </nav>
      </div>
    </header>
  );
}
