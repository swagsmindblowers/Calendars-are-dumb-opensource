# Security policy

This app handles OAuth tokens for people's calendars, so security reports are
taken seriously.

## Reporting a vulnerability

Please **do not open a public issue**. Use GitHub's private reporting instead:
the **Security** tab of this repository → **Report a vulnerability**.

Include what's affected, steps to reproduce, and the impact you see. You'll
get an acknowledgement as soon as the maintainer can manage; this is a
small, spare-time project, so there is no guaranteed response time.

## Scope

In scope: authentication and session handling, OAuth token storage and
encryption, the public booking endpoints (injection, abuse, access to other
users' data), and file upload handling.

Out of scope: problems that need `AUTH_DEV_BYPASS=true` (it intentionally
disables authentication), and misconfiguration of your own deployment such as
leaked secrets.

## If you self-host

You are responsible for your instance. Keep `AUTH_SECRET` and
`TOKEN_ENCRYPTION_KEY` secret and backed up, never enable `AUTH_DEV_BYPASS`
in production, keep dependencies updated, and run `npm audit`.
