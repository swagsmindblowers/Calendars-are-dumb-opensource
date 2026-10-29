import { DateTime } from "luxon";
import { getPrisma } from "@/lib/prisma";

export type Slot = {
  start: Date;
  end: Date;
};

type BusyInterval = { start: Date; end: Date };

function overlaps(a: BusyInterval, b: BusyInterval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Available start times for `eventTypeId` on the calendar day `dateISO`
 * ("YYYY-MM-DD"), where "day" is defined in the event type owner's
 * timezone. Subtracts every Event across all of the owner's connected
 * calendars, plus any other non-cancelled Booking, and applies the event
 * type's buffers around each candidate slot.
 */
export async function getAvailableSlots(
  eventTypeId: string,
  dateISO: string,
  options?: { excludeBookingId?: string }
): Promise<Slot[]> {
  const prisma = await getPrisma();

  const eventType = await prisma.eventType.findUnique({
    where: { id: eventTypeId },
    include: { user: true },
  });
  if (!eventType || !eventType.active) return [];

  const timezone = eventType.user.timezone ?? "UTC";
  const day = DateTime.fromISO(dateISO, { zone: timezone });
  if (!day.isValid) return [];

  const dayOfWeek = day.weekday % 7; // luxon: 1=Mon..7=Sun -> 0=Sun..6=Sat
  const windows = await prisma.availability.findMany({
    where: { userId: eventType.userId, dayOfWeek },
  });
  if (windows.length === 0) return [];

  const dayStart = day.startOf("day");
  const dayEnd = day.endOf("day");

  const [events, otherBookings] = await Promise.all([
    prisma.event.findMany({
      where: {
        source: { userId: eventType.userId },
        start: { lt: dayEnd.toJSDate() },
        end: { gt: dayStart.toJSDate() },
      },
      select: { start: true, end: true },
    }),
    prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        eventType: { userId: eventType.userId },
        start: { lt: dayEnd.toJSDate() },
        end: { gt: dayStart.toJSDate() },
        ...(options?.excludeBookingId ? { id: { not: options.excludeBookingId } } : {}),
      },
      select: { start: true, end: true },
    }),
  ]);

  const busy: BusyInterval[] = [...events, ...otherBookings];

  const now = DateTime.now();
  const duration = eventType.durationMinutes;
  const slots: Slot[] = [];

  for (const window of windows) {
    const [startHour, startMinute] = window.startTime.split(":").map(Number);
    const [endHour, endMinute] = window.endTime.split(":").map(Number);
    let cursor = day.set({
      hour: startHour,
      minute: startMinute,
      second: 0,
      millisecond: 0,
    });
    const windowEnd = day.set({
      hour: endHour,
      minute: endMinute,
      second: 0,
      millisecond: 0,
    });

    while (cursor.plus({ minutes: duration }) <= windowEnd) {
      const slotStart = cursor;
      const slotEnd = cursor.plus({ minutes: duration });

      if (slotStart > now) {
        const padded: BusyInterval = {
          start: slotStart
            .minus({ minutes: eventType.bufferBeforeMinutes })
            .toJSDate(),
          end: slotEnd.plus({ minutes: eventType.bufferAfterMinutes }).toJSDate(),
        };
        const isBusy = busy.some((b) => overlaps(padded, b));
        if (!isBusy) {
          slots.push({ start: slotStart.toJSDate(), end: slotEnd.toJSDate() });
        }
      }

      cursor = cursor.plus({ minutes: duration });
    }
  }

  return slots;
}
