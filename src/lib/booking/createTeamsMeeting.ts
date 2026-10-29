import type { Account, CalendarSource, PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { GRAPH_BASE, getFreshAccessToken } from "@/lib/sync/microsoft";

export type TeamsMeetingInput = {
  subject: string;
  description?: string | null;
  start: Date;
  end: Date;
  attendeeEmail: string;
  attendeeName: string;
};

export type TeamsMeetingResult = {
  externalEventId: string;
  joinUrl: string | null;
};

type GraphCreatedEvent = {
  id: string;
  onlineMeeting?: { joinUrl?: string } | null;
};

/** Resolves the connected Microsoft Account + a fresh access token for `source`. */
async function getBookingAccessToken(
  prisma: PrismaClient,
  source: CalendarSource
): Promise<string> {
  if (source.type !== "MICROSOFT" || !source.providerAccountId) {
    throw new Error("Booking calendar must be a connected Microsoft account.");
  }

  const account: Account | null = await prisma.account.findFirst({
    where: {
      provider: "microsoft-entra-id",
      providerAccountId: source.providerAccountId,
    },
  });
  if (!account) {
    throw new Error("Connected Microsoft account not found; reconnect it.");
  }

  return getFreshAccessToken(prisma, account);
}

/**
 * Creates a real Outlook calendar event with a Teams meeting attached, on
 * the Microsoft account backing `source`. `source` must be the
 * `isBookingTarget` CalendarSource, connected with Calendars.ReadWrite.
 */
export async function createTeamsMeeting(
  source: CalendarSource,
  input: TeamsMeetingInput
): Promise<TeamsMeetingResult> {
  const prisma = await getPrisma();
  const accessToken = await getBookingAccessToken(prisma, source);

  const res = await fetch(`${GRAPH_BASE}/me/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: input.subject,
      body: input.description
        ? { contentType: "text", content: input.description }
        : undefined,
      start: { dateTime: input.start.toISOString(), timeZone: "UTC" },
      end: { dateTime: input.end.toISOString(), timeZone: "UTC" },
      attendees: [
        {
          emailAddress: { address: input.attendeeEmail, name: input.attendeeName },
          type: "required",
        },
      ],
      isOnlineMeeting: true,
      onlineMeetingProvider: "teamsForBusiness",
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create Teams meeting: ${await res.text()}`);
  }

  const created = (await res.json()) as GraphCreatedEvent;
  return {
    externalEventId: created.id,
    joinUrl: created.onlineMeeting?.joinUrl ?? null,
  };
}

/** Deletes a previously created Graph event (used when a booking is cancelled). */
export async function deleteGraphEvent(
  source: CalendarSource,
  externalEventId: string
): Promise<void> {
  if (source.type !== "MICROSOFT" || !source.providerAccountId) return;

  const prisma = await getPrisma();
  const accessToken = await getBookingAccessToken(prisma, source).catch(() => null);
  if (!accessToken) return;

  await fetch(`${GRAPH_BASE}/me/events/${externalEventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/**
 * Moves a previously created Graph event to a new start/end time (used when
 * a booking is rescheduled). PATCHing in place, rather than delete+recreate,
 * preserves the existing Teams meeting's joinUrl and attendee thread.
 */
export async function updateGraphEvent(
  source: CalendarSource,
  externalEventId: string,
  input: { start: Date; end: Date }
): Promise<void> {
  const prisma = await getPrisma();
  const accessToken = await getBookingAccessToken(prisma, source);

  const res = await fetch(`${GRAPH_BASE}/me/events/${externalEventId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      start: { dateTime: input.start.toISOString(), timeZone: "UTC" },
      end: { dateTime: input.end.toISOString(), timeZone: "UTC" },
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to reschedule the Teams meeting: ${await res.text()}`);
  }
}
