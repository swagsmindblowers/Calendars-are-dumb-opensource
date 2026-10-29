"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { syncSource } from "@/lib/sync";
import type { PrismaClient } from "@prisma/client";
import { checkRateLimit } from "@/lib/rateLimit";
import { writeAuditLog } from "@/lib/audit";
import { getAvailableSlots } from "./availability";
import { createTeamsMeeting, deleteGraphEvent, updateGraphEvent } from "./createTeamsMeeting";
import {
  sendEmail,
  bookingConfirmationEmail,
  rescheduledBookingEmail,
  reminderBookingEmail,
  scheduleReminderEmail,
  rescheduleReminderEmail,
  cancelReminderEmail,
} from "@/lib/email";

const REMINDER_LEAD_MS = 60 * 60_000; // 1 hour before the meeting

/**
 * Schedules a "starting soon" reminder for a booking, or updates/cancels an
 * already-scheduled one -- shared by createBooking and rescheduleBooking so
 * both go through the same create-vs-reschedule-vs-too-soon logic.
 */
async function syncReminderEmail(
  prisma: PrismaClient,
  booking: { id: string; reminderEmailId: string | null },
  details: {
    to: string;
    eventTypeName: string;
    start: Date;
    end: Date;
    joinUrl: string | null;
    cancelUrl: string;
    rescheduleUrl: string;
  }
): Promise<void> {
  const reminderAt = new Date(details.start.getTime() - REMINDER_LEAD_MS);

  if (reminderAt <= new Date()) {
    if (booking.reminderEmailId) {
      await cancelReminderEmail(booking.reminderEmailId).catch(() => undefined);
      await prisma.booking.update({ where: { id: booking.id }, data: { reminderEmailId: null } });
    }
    return;
  }

  if (booking.reminderEmailId) {
    const rescheduled = await rescheduleReminderEmail(booking.reminderEmailId, reminderAt).catch(
      () => false
    );
    if (rescheduled) return;
  }

  const { subject, html } = reminderBookingEmail(details);
  const newId = await scheduleReminderEmail({
    to: details.to,
    subject,
    html,
    scheduledAt: reminderAt,
  }).catch(() => null);

  if (newId !== booking.reminderEmailId) {
    await prisma.booking.update({ where: { id: booking.id }, data: { reminderEmailId: newId } });
  }
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not signed in.");
  }
  return session.user.id;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export type EventTypeInput = {
  name: string;
  description: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
};

export async function createEventType(input: EventTypeInput) {
  const userId = await requireUserId();
  const prisma = await getPrisma();

  await prisma.eventType.create({
    data: {
      userId,
      slug: slugify(input.name) || "meeting",
      name: input.name,
      description: input.description || null,
      durationMinutes: input.durationMinutes,
      bufferBeforeMinutes: input.bufferBeforeMinutes,
      bufferAfterMinutes: input.bufferAfterMinutes,
    },
  });
  revalidatePath("/event-types");
}

export async function deleteEventType(eventTypeId: string) {
  const userId = await requireUserId();
  const prisma = await getPrisma();
  await prisma.eventType.deleteMany({ where: { id: eventTypeId, userId } });
  revalidatePath("/event-types");
}

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/;

export async function updateUsername(
  username: string
): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireUserId();
  const trimmed = username.trim().toLowerCase();

  if (!USERNAME_RE.test(trimmed)) {
    return {
      ok: false,
      error:
        "Use 2-30 characters: lowercase letters, numbers, and hyphens (not at the start or end).",
    };
  }

  const prisma = await getPrisma();
  try {
    await prisma.user.update({ where: { id: userId }, data: { username: trimmed } });
  } catch (err) {
    const isUniqueConflict =
      typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
    if (isUniqueConflict) {
      return { ok: false, error: "That username is taken." };
    }
    throw err;
  }

  revalidatePath("/settings");
  revalidatePath("/event-types");
  return { ok: true };
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export async function updateAccentColor(
  color: string
): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireUserId();
  const trimmed = color.trim();

  if (!HEX_COLOR_RE.test(trimmed)) {
    return { ok: false, error: "Enter a hex color like #4f46e5." };
  }

  const prisma = await getPrisma();
  await prisma.user.update({ where: { id: userId }, data: { accentColor: trimmed } });

  revalidatePath("/settings");
  revalidatePath("/u/[username]", "page");
  revalidatePath("/book/[username]/[slug]", "page");
  return { ok: true };
}

export async function setAvailability(
  timezone: string,
  windows: { dayOfWeek: number; startTime: string; endTime: string }[]
) {
  const userId = await requireUserId();
  const prisma = await getPrisma();

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { timezone } }),
    prisma.availability.deleteMany({ where: { userId } }),
    prisma.availability.createMany({
      data: windows.map((w) => ({ ...w, userId })),
    }),
  ]);
  revalidatePath("/availability");
}

export async function setBookingCalendar(sourceId: string) {
  const userId = await requireUserId();
  const prisma = await getPrisma();

  await prisma.$transaction([
    prisma.calendarSource.updateMany({
      where: { userId, isBookingTarget: true },
      data: { isBookingTarget: false },
    }),
    prisma.calendarSource.updateMany({
      where: { id: sourceId, userId },
      data: { isBookingTarget: true },
    }),
  ]);
  revalidatePath("/sources");
}

export type CreateBookingInput = {
  username: string;
  eventTypeSlug: string;
  start: string; // ISO
  bookerName: string;
  bookerEmail: string;
  bookerTimezone: string;
  notes: string;
};

export async function createBooking(input: CreateBookingInput): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!(await checkRateLimit("BOOKING_WRITE_LIMITER"))) {
    return { ok: false, error: "Too many requests -- please try again in a minute." };
  }

  const prisma = await getPrisma();

  // slug is only unique per user -- scope by username too so two
  // different users' event types can't collide.
  const eventType = await prisma.eventType.findFirst({
    where: {
      slug: input.eventTypeSlug,
      active: true,
      user: { username: input.username },
    },
  });
  if (!eventType) return { ok: false, error: "This meeting type is no longer available." };

  const start = new Date(input.start);
  const end = new Date(start.getTime() + eventType.durationMinutes * 60_000);

  const dateISO = start.toISOString().slice(0, 10);
  const freeSlots = await getAvailableSlots(eventType.id, dateISO);
  const stillFree = freeSlots.some((s) => s.start.getTime() === start.getTime());
  if (!stillFree) {
    return { ok: false, error: "That time was just booked. Please pick another slot." };
  }

  const bookingSource = await prisma.calendarSource.findFirst({
    where: { userId: eventType.userId, isBookingTarget: true },
  });
  if (!bookingSource) {
    return { ok: false, error: "No booking calendar is configured yet." };
  }

  let externalEventId: string | null = null;
  let joinUrl: string | null = null;
  try {
    const meeting = await createTeamsMeeting(bookingSource, {
      subject: `${eventType.name} with ${input.bookerName}`,
      description: input.notes || null,
      start,
      end,
      attendeeEmail: input.bookerEmail,
      attendeeName: input.bookerName,
    });
    externalEventId = meeting.externalEventId;
    joinUrl = meeting.joinUrl;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create the meeting.",
    };
  }

  const booking = await prisma.booking.create({
    data: {
      eventTypeId: eventType.id,
      bookerName: input.bookerName,
      bookerEmail: input.bookerEmail,
      bookerTimezone: input.bookerTimezone,
      start,
      end,
      notes: input.notes || null,
      externalEventId,
      joinUrl,
    },
  });

  await writeAuditLog(prisma, {
    action: "BOOKING_CREATED",
    bookingId: booking.id,
    userId: eventType.userId,
    actorEmail: input.bookerEmail,
    detail: `${eventType.name} at ${start.toUTCString()}`,
  }).catch(() => undefined);

  await syncSource(bookingSource).catch(() => undefined);

  const appUrl = process.env.APP_URL ?? "";
  const cancelUrl = `${appUrl}/book/${input.username}/${eventType.slug}/cancel/${booking.id}`;
  const rescheduleUrl = `${appUrl}/book/${input.username}/${eventType.slug}/reschedule/${booking.id}`;

  const { subject, html } = bookingConfirmationEmail({
    eventTypeName: eventType.name,
    start,
    end,
    joinUrl,
    cancelUrl,
    rescheduleUrl,
  });
  await sendEmail({ to: input.bookerEmail, subject, html });

  await syncReminderEmail(
    prisma,
    { id: booking.id, reminderEmailId: null },
    {
      to: input.bookerEmail,
      eventTypeName: eventType.name,
      start,
      end,
      joinUrl,
      cancelUrl,
      rescheduleUrl,
    }
  ).catch(() => undefined);

  return { ok: true };
}

// The booking id (an unguessable cuid) doubles as the cancel token — it's
// only ever handed out in the confirmation email.
export async function cancelBooking(bookingId: string) {
  if (!(await checkRateLimit("BOOKING_WRITE_LIMITER"))) return;

  const prisma = await getPrisma();
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { eventType: true },
  });
  if (!booking || booking.status === "CANCELLED") return;

  const bookingSource = await prisma.calendarSource.findFirst({
    where: { userId: booking.eventType.userId, isBookingTarget: true },
  });
  if (bookingSource && booking.externalEventId) {
    await deleteGraphEvent(bookingSource, booking.externalEventId).catch(() => undefined);
  }

  if (booking.reminderEmailId) {
    await cancelReminderEmail(booking.reminderEmailId).catch(() => undefined);
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  await writeAuditLog(prisma, {
    action: "BOOKING_CANCELLED",
    bookingId: booking.id,
    userId: booking.eventType.userId,
    actorEmail: booking.bookerEmail,
    detail: `${booking.eventType.name} at ${booking.start.toUTCString()}`,
  }).catch(() => undefined);

  if (bookingSource) {
    await syncSource(bookingSource).catch(() => undefined);
  }
}

// Same unguessable-cuid-as-token pattern as cancelBooking.
export async function rescheduleBooking(
  bookingId: string,
  newStart: string // ISO
): Promise<{ ok: boolean; error?: string }> {
  if (!(await checkRateLimit("BOOKING_WRITE_LIMITER"))) {
    return { ok: false, error: "Too many requests -- please try again in a minute." };
  }

  const prisma = await getPrisma();
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { eventType: { include: { user: true } } },
  });
  if (!booking || booking.status === "CANCELLED") {
    return { ok: false, error: "This booking is no longer available." };
  }

  const start = new Date(newStart);
  const end = new Date(start.getTime() + booking.eventType.durationMinutes * 60_000);

  const dateISO = start.toISOString().slice(0, 10);
  const freeSlots = await getAvailableSlots(booking.eventType.id, dateISO, {
    excludeBookingId: bookingId,
  });
  const stillFree = freeSlots.some((s) => s.start.getTime() === start.getTime());
  if (!stillFree) {
    return { ok: false, error: "That time was just booked. Please pick another slot." };
  }

  const bookingSource = await prisma.calendarSource.findFirst({
    where: { userId: booking.eventType.userId, isBookingTarget: true },
  });

  if (bookingSource && booking.externalEventId) {
    try {
      await updateGraphEvent(bookingSource, booking.externalEventId, { start, end });
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to reschedule the meeting.",
      };
    }
  }

  await prisma.booking.update({ where: { id: bookingId }, data: { start, end } });

  await writeAuditLog(prisma, {
    action: "BOOKING_RESCHEDULED",
    bookingId: booking.id,
    userId: booking.eventType.userId,
    actorEmail: booking.bookerEmail,
    detail: `${booking.eventType.name}: ${booking.start.toUTCString()} -> ${start.toUTCString()}`,
  }).catch(() => undefined);

  if (bookingSource) {
    await syncSource(bookingSource).catch(() => undefined);
  }

  const appUrl = process.env.APP_URL ?? "";
  const username = booking.eventType.user.username ?? "";
  const cancelUrl = `${appUrl}/book/${username}/${booking.eventType.slug}/cancel/${booking.id}`;
  const rescheduleUrl = `${appUrl}/book/${username}/${booking.eventType.slug}/reschedule/${booking.id}`;

  const { subject, html } = rescheduledBookingEmail({
    eventTypeName: booking.eventType.name,
    start,
    end,
    joinUrl: booking.joinUrl,
    cancelUrl,
    rescheduleUrl,
  });
  await sendEmail({ to: booking.bookerEmail, subject, html });

  await syncReminderEmail(
    prisma,
    { id: booking.id, reminderEmailId: booking.reminderEmailId },
    {
      to: booking.bookerEmail,
      eventTypeName: booking.eventType.name,
      start,
      end,
      joinUrl: booking.joinUrl,
      cancelUrl,
      rescheduleUrl,
    }
  ).catch(() => undefined);

  return { ok: true };
}
