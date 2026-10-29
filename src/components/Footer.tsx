import Link from "next/link";
import { getSite } from "@/lib/site";

export function Footer() {
  const site = getSite();
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <span style={{ fontWeight: 700 }}>{site.host}</span>
        <div className="row" style={{ gap: 16 }}>
          <Link href="/about">About</Link>
          <Link href="/privacy">Privacy &amp; cookies</Link>
          <Link href="/terms">Terms</Link>
          {site.contactEmail && (
            <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
          )}
        </div>
      </div>
    </footer>
  );
}
