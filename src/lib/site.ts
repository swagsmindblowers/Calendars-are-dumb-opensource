// Instance-specific identity, so a self-hosted deployment doesn't have to
// fork the source to rebrand. Read at call time (not
// module load) because APP_URL / SITE_NAME / CONTACT_EMAIL are runtime vars on Workers.
// Pages that call this must be dynamic (not prerendered at build time).
export function getSite() {
  const name = process.env.SITE_NAME || "Calendars are dumb";
  let host = name;
  try {
    host = new URL(process.env.APP_URL ?? "").host || host;
  } catch {
    // APP_URL unset or malformed -- fall back to the product name.
  }
  return {
    name,
    host,
    // Optional. When unset, contact links are simply omitted.
    contactEmail: process.env.CONTACT_EMAIL || null,
  };
}
