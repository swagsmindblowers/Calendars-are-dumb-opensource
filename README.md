# Calendars are dumb

One merged view of every calendar you juggle, and booking links that check all
of them before letting anyone book you.

- **Unified calendar** — Google Calendar, Outlook / Microsoft 365, and any
  calendar that exposes a private ICS feed (handy for work calendars you don't
  have admin rights on), merged into one read-only view.
- **Booking pages** — set weekly availability, publish event types, and share a
  link. A slot is only offered if it's free on *every* connected calendar.
- **Bookings create real events** — and a Teams meeting link when a Microsoft
  account is connected. Confirmation and reminder emails via Resend.
- **Branding** — per-user logo and accent colour on public booking pages.

It's a [Next.js](https://nextjs.org) app that runs on
[Cloudflare Workers](https://workers.cloudflare.com) with a D1 (SQLite)
database and an R2 bucket, via [OpenNext](https://opennext.js.org/cloudflare).
You host your own copy; there is no shared service to sign up for.

> **Status:** early. It works, but expect rough edges — see
> [Known issues](#known-issues).

## Run it locally

Requires Node.js 20+. No Cloudflare account is needed for this; Wrangler
emulates D1 and R2 on your machine.

```bash
git clone https://github.com/swagsmindblowers/Calendars-are-dumb-opensource.git
cd Calendars-are-dumb-opensource
npm install

cp .env.example .env
# Edit .env:
#   AUTH_SECRET            -> run: npx auth secret   (or any long random string)
#   TOKEN_ENCRYPTION_KEY   -> run: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
#   AUTH_DEV_BYPASS="true" -> adds a "Continue as dev user" button so you can
#                             try the app without registering OAuth apps

npm run db:migrate      # creates the local D1 database
npm run cf:preview      # builds, then serves at http://localhost:8787
```

Open <http://localhost:8787>. With `AUTH_DEV_BYPASS` on you can sign in as a dev
user and add a private ICS feed right away. To connect Google or Microsoft
accounts, set up OAuth credentials (below) and put
`APP_URL=http://localhost:8787` in `wrangler.jsonc`'s `vars` so redirect URLs
match.

`AUTH_DEV_BYPASS` skips authentication entirely. Never enable it on anything
other people can reach.

## Deploy your own

You need a [Cloudflare account](https://dash.cloudflare.com/sign-up) and,
optionally, a domain on Cloudflare. Plan on the **Workers Paid plan**: the
bundled Worker is about 3.0 MiB gzipped, which sits right at the free plan's
3 MiB limit and will tip over as the app grows (paid allows 10 MiB).

```bash
npx wrangler login
```

1. **Create the database**, then paste the `database_id` it prints into
   `wrangler.jsonc` (`d1_databases[0].database_id`):
   ```bash
   npx wrangler d1 create calendars-are-dumb
   ```
2. **Create the logo bucket** (name must match `wrangler.jsonc`):
   ```bash
   npx wrangler r2 bucket create calendars-are-dumb-logos
   ```
3. **Set your URL** in `wrangler.jsonc` `vars.APP_URL` (e.g.
   `https://cal.example.com`, or your `*.workers.dev` URL after the first
   deploy). To use a custom domain, uncomment and edit `routes`.
4. **Apply the schema** to the real database:
   ```bash
   npm run db:migrate:remote
   ```
   Re-run this after pulling updates; only new migrations are applied.
5. **Set secrets** (these live in Cloudflare, never in git):
   ```bash
   npx wrangler secret put AUTH_SECRET
   npx wrangler secret put TOKEN_ENCRYPTION_KEY
   npx wrangler secret put AUTH_GOOGLE_ID
   npx wrangler secret put AUTH_GOOGLE_SECRET
   npx wrangler secret put AUTH_MICROSOFT_ENTRA_ID_ID
   npx wrangler secret put AUTH_MICROSOFT_ENTRA_ID_SECRET
   npx wrangler secret put RESEND_API_KEY        # optional, for emails
   ```
   Also add `"AUTH_TRUST_HOST": "true"` to `vars` in `wrangler.jsonc`. Leave
   `AUTH_DEV_BYPASS` unset.
6. **Deploy:**
   ```bash
   npm run cf:deploy
   ```

Back up `TOKEN_ENCRYPTION_KEY`. It encrypts stored OAuth tokens at rest, and
losing or rotating it makes every connected Google/Microsoft account
unreadable (users have to reconnect). There is no re-encryption path.

### OAuth setup

You can skip Google, Microsoft, or both; the sign-in buttons for a provider
you haven't configured simply won't work. ICS feeds need no OAuth.

Register these redirect URIs, replacing the host with your `APP_URL`:

| Provider | Redirect URIs |
| --- | --- |
| Google ([Cloud Console](https://console.cloud.google.com/apis/credentials)) | `/api/auth/callback/google` and `/api/connect/google/callback` |
| Microsoft ([Entra](https://entra.microsoft.com)) | `/api/auth/callback/microsoft-entra-id` and `/api/connect/microsoft-entra-id/callback` |

The first of each pair is for signing in; the second is for connecting
*additional* accounts from the Sources page.

- **Google:** enable the Google Calendar API. Scope used:
  `calendar.readonly`. Google treats this as a sensitive scope, so a public
  deployment beyond 100 users needs Google's app verification.
- **Microsoft:** supported account types should allow personal and work/school
  accounts (the `common` tenant). Scope used: `Calendars.ReadWrite` (needed to
  create booked events and Teams meetings).

### Configuration reference

| Variable | Required | Purpose |
| --- | --- | --- |
| `AUTH_SECRET` | yes | Signs session cookies. |
| `TOKEN_ENCRYPTION_KEY` | yes | Base64 32-byte AES key for tokens at rest. |
| `AUTH_TRUST_HOST` | on Workers | Set `true`; Cloudflare isn't auto-trusted. |
| `APP_URL` | yes | Public URL; used for OAuth redirects and email links. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | for Google | OAuth client. |
| `AUTH_MICROSOFT_ENTRA_ID_ID` / `_SECRET` | for Microsoft | OAuth client. |
| `RESEND_API_KEY` | no | Without it, emails are skipped and logged. |
| `RESEND_FROM_EMAIL` | no | Sender; must be a domain verified with Resend. |
| `CONTACT_EMAIL` | no | Shown in the footer and on the privacy/terms pages. |
| `AUTH_DEV_BYPASS` | no | **Local only.** Passwordless dev sign-in. |

Locally, put these in `.env`. In production, secrets go through
`wrangler secret put` and plain values go in `wrangler.jsonc` `vars`.

### Privacy and terms pages

`/privacy` and `/terms` ship as generic starting-point text. If you run a
public instance, **you** are the operator: read them, edit them to match what
you actually do, and take your own legal advice. They are not a substitute for
that.

### Backups

D1 keeps point-in-time history automatically
([Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/):
30 days on a paid Workers plan, 7 on free). To roll back:

```bash
npx wrangler d1 time-travel info calendars-are-dumb
npx wrangler d1 time-travel restore calendars-are-dumb --timestamp="2026-01-01T00:00:00Z"
```

R2 logos are not covered by this.

## Known issues

- **`npm run dev` can't sign in.** The dev server starts and serves public
  pages, but anything that touches the database fails with Prisma's
  `The loaded wasm module was unexpectedly undefined`. Use
  `npm run cf:preview` (slower, since it rebuilds) until this is fixed. Help
  welcome.
- `npm audit` reports vulnerabilities in transitive dependencies. Check it
  before deploying anything public.
- Calendar sources are read-only; the only writes are events created by
  bookings.

## Project layout

```
src/app/            Next.js routes (UI, booking pages, API routes)
src/lib/sync/       Google / Microsoft / ICS fetching
src/lib/booking/    Availability maths and booking actions
src/lib/oauth/      Provider config for connecting extra accounts
prisma/             Schema and SQL migrations
scripts/            db-migrate.mjs, Prisma client patch for Workers
wrangler.jsonc      Cloudflare bindings and vars
```

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).
Security problems: see [SECURITY.md](SECURITY.md) — please don't open a public
issue.

## License

[MIT](LICENSE)
