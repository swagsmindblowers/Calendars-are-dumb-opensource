import * as ical from "node-ical";
import type { CalendarSource } from "@prisma/client";
import type { NormalizedEvent, SyncResult } from "./types";

type VEvent = ical.VEvent & {
  rrule?: { between(after: Date, before: Date, inc?: boolean): Date[] };
  exdate?: Record<string, Date>;
  duration?: number;
};

const WINDOW_PAST_MONTHS = 1;
const WINDOW_FUTURE_YEARS = 1;

// node-ical types some text fields as either a plain string or a
// { val, params } wrapper when the field carries iCal parameters.
function textOf(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "val" in value) {
    return String((value as { val: unknown }).val);
  }
  return String(value);
}

export async function syncIcsSource(source: CalendarSource): Promise<SyncResult> {
  if (!source.icsUrl) {
    throw new Error("ICS source is missing its feed URL.");
  }

  const parsed = await ical.async.fromURL(source.icsUrl);

  const windowStart = new Date();
  windowStart.setMonth(windowStart.getMonth() - WINDOW_PAST_MONTHS);
  const windowEnd = new Date();
  windowEnd.setFullYear(windowEnd.getFullYear() + WINDOW_FUTURE_YEARS);

  const events: NormalizedEvent[] = [];

  for (const key of Object.keys(parsed)) {
    const item = parsed[key] as VEvent;
    if (item.type !== "VEVENT" || !item.start || !item.end) continue;

    const allDay = Boolean(
      (item.start as unknown as { dateOnly?: boolean }).dateOnly
    );
    const durationMs = item.end.getTime() - item.start.getTime();

    if (item.rrule) {
      const excluded = new Set(
        Object.values(item.exdate ?? {}).map((d) => d.getTime())
      );
      const occurrences = item.rrule.between(windowStart, windowEnd, true);
      for (const occurrence of occurrences) {
        if (excluded.has(occurrence.getTime())) continue;
        events.push({
          externalId: `${item.uid ?? key}:${occurrence.toISOString()}`,
          title: textOf(item.summary) ?? "(no title)",
          description: textOf(item.description),
          location: textOf(item.location),
          start: occurrence,
          end: new Date(occurrence.getTime() + durationMs),
          allDay,
        });
      }
      continue;
    }

    if (item.end < windowStart || item.start > windowEnd) continue;

    events.push({
      externalId: item.uid ?? key,
      title: textOf(item.summary) ?? "(no title)",
      description: textOf(item.description),
      location: textOf(item.location),
      start: new Date(item.start),
      end: new Date(item.end),
      allDay,
    });
  }

  return { events };
}
