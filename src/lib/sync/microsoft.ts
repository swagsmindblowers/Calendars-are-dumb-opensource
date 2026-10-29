import type { CalendarSource, Account, PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import type { NormalizedEvent, SyncResult } from "./types";

const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
export const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export async function getFreshAccessToken(
  prisma: PrismaClient,
  account: Account
): Promise<string> {
  const expiresAt = account.expires_at ? account.expires_at * 1000 : 0;
  if (account.access_token && expiresAt > Date.now() + 60_000) {
    return account.access_token;
  }
  if (!account.refresh_token) {
    throw new Error("Microsoft account has no refresh token; reconnect the account.");
  }

  const body = new URLSearchParams({
    client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID ?? "",
    client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ?? "",
    grant_type: "refresh_token",
    refresh_token: account.refresh_token,
    scope: "openid email profile offline_access Calendars.ReadWrite",
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
        ? " Reconnect this Microsoft account from the Sources page."
        : "";
    throw new Error(
      `Failed to refresh Microsoft access token (${res.status}): ${detail}.${hint}`
    );
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: json.access_token,
      refresh_token: json.refresh_token ?? account.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + json.expires_in,
    },
  });

  return json.access_token;
}

type GraphEvent = {
  id: string;
  subject?: string;
  bodyPreview?: string;
  location?: { displayName?: string };
  isAllDay?: boolean;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
};

export async function syncMicrosoftSource(
  source: CalendarSource
): Promise<SyncResult> {
  if (!source.providerAccountId) {
    throw new Error("Microsoft calendar source is missing its account link.");
  }
  const prisma = await getPrisma();
  const account = await prisma.account.findFirst({
    where: {
      provider: "microsoft-entra-id",
      providerAccountId: source.providerAccountId,
    },
  });
  if (!account) {
    throw new Error("Connected Microsoft account not found; reconnect it.");
  }

  const accessToken = await getFreshAccessToken(prisma, account);

  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  const end = new Date();
  end.setFullYear(end.getFullYear() + 1);

  const events: NormalizedEvent[] = [];
  let url =
    `${GRAPH_BASE}/me/calendarView?` +
    new URLSearchParams({
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      $top: "100",
    }).toString();

  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="UTC"',
      },
    });
    if (!res.ok) {
      throw new Error(
        `Microsoft Graph request failed (${res.status}): ${await res.text()}`
      );
    }
    const json = (await res.json()) as {
      value: GraphEvent[];
      "@odata.nextLink"?: string;
    };

    for (const item of json.value) {
      events.push({
        externalId: item.id,
        title: item.subject ?? "(no title)",
        description: item.bodyPreview ?? null,
        location: item.location?.displayName ?? null,
        start: new Date(item.start.dateTime + "Z"),
        end: new Date(item.end.dateTime + "Z"),
        allDay: Boolean(item.isAllDay),
      });
    }

    url = json["@odata.nextLink"] ?? "";
  }

  return { events };
}
