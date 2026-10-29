# Contributing

Thanks for looking. Bug reports, fixes, and focused features are welcome.

## Setup

Follow "Run it locally" in the [README](README.md). Use `npm run cf:preview`,
not `npm run dev` — sign-in doesn't work under the dev server yet (see Known
issues). Fixing that would be a very welcome contribution.

## Before opening a PR

```bash
npm run lint
npm run typecheck
npm run cf:build
```

CI runs the same three. Please also click through whatever you changed in
`cf:preview`; there are no automated tests yet, so that is the safety net.

## Guidelines

- Keep PRs small and about one thing. Open an issue first for anything large
  or that changes the data model.
- A schema change needs a Prisma migration: edit `prisma/schema.prisma`, then
  create the migration SQL under `prisma/migrations/`. Check that
  `npm run db:migrate` applies it cleanly from scratch.
- Never commit secrets, `.env`, or your own `wrangler.jsonc` ids/domain.
  Don't put instance-specific names in code; use `getSite()` in
  `src/lib/site.ts` or an env var.
- Match the surrounding style. Comments should explain *why*, not *what*.

## Reporting bugs

Include what you did, what happened, what you expected, and whether it was on
`cf:preview` or a deployed Worker. Don't paste tokens, ICS feed URLs (they
contain private keys), or logs with personal data.

Security issues: see [SECURITY.md](SECURITY.md).
