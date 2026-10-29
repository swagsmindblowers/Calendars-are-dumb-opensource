import type { CalendarSource, Account, PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import type { NormalizedEvent, SyncResult } from "./types";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

async function getFreshAccessToken(
  prisma: PrismaClient,
  account: Account
): Promise<string> {
  const expiresAt = account.expires_at ? account.expires_at * 1000 : 0;
  if (account.access_token && expiresAt > Date.now() + 60_000) {
    return account.access_token;
  }
  if (!account.refresh_token) {
    throw new Error("Google account has no refresh token; reconnect the account.");
  }

  const body = new URLSearchParams({
    client_id: process.env.AUTH_GOOGLE_ID ?? "",
    client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
    grant_type: "refresh_token",
    refresh_token: account.refresh_token,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    // A 4xx here (e.g. invalid_grant) means the refresh token itself was
    // revoked -- no amount of retrying fixes that, only reconnecting does.
    const detail = await res.text();
    const hint =
      res.status >= 400 && res.status < 500
        ? " Reconnect this Google account from the Sources page."
        : "";
    throw new Error(
      `Failed to refresh Google access token (${res.status}): ${detail}.${hint}`
    );
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: json.access_token,
      expires_at: Math.floor(Date.now() / 1000) + json.expires_in,
    },
  });

  return json.access_token;
}

type GoogleEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

export async function syncGoogleSource(source: CalendarSource): Promise<SyncResult> {
  if (!source.providerAccountId) {
    throw new Error("Google calendar source is missing its account link.");
  }
  const prisma = await getPrisma();
  const account = await prisma.account.findFirst({
    where: { provider: "google", providerAccountId: source.providerAccountId },
  });
  if (!account) {
    throw new Error("Connected Google account not found; reconnect it.");
  }

  const accessToken = await getFreshAccessToken(prisma, account);

  const calendarId = source.externalCalendarId ?? "primary";
  const timeMin = new Date();
  timeMin.setMonth(timeMin.getMonth() - 1);
  const timeMax = new Date();
  timeMax.setFullYear(timeMax.getFullYear() + 1);

  const events: NormalizedEvent[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: "true",
      maxResults: "250",
      ...(pageToken ? { pageToken } : {}),
    });

    const res = await fetch(
      `${CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) {
      throw new Error(
        `Google Calendar request failed (${res.status}): ${await res.text()}`
      );
    }
    const json = (await res.json()) as {
      items?: GoogleEvent[];
      nextPageToken?: string;
    };

    for (const item of json.items ?? []) {
      if (!item.id || item.status === "cancelled") continue;
      const allDay = Boolean(item.start?.date);
      const start = item.start?.dateTime ?? item.start?.date;
      const end = item.end?.dateTime ?? item.end?.date;
      if (!start || !end) continue;

      events.push({
        externalId: item.id,
        title: item.summary ?? "(no title)",
        description: item.description ?? null,
        location: item.location ?? null,
        start: new Date(start),
        end: new Date(end),
        allDay,
      });
    }
    pageToken = json.nextPageToken;
  } while (pageToken);

  return { events };
}
