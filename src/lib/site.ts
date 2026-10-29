// Instance-specific identity, so a self-hosted deployment doesn't have to
// fork the source to rebrand. Read at call time (not
// module load) because APP_URL / CONTACT_EMAIL are runtime vars on Workers.
// Pages that call this must be dynamic (not prerendered at build time).
export function getSite() {
  let host = "Calendars are dumb";
  try {
    host = new URL(process.env.APP_URL ?? "").host || host;
  } catch {
    // APP_URL unset or malformed -- fall back to the product name.
  }
  return {
    name: "Calendars are dumb",
    host,
    // Optional. When unset, contact links are simply omitted.
    contactEmail: process.env.CONTACT_EMAIL || null,
  };
}
