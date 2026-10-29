import { getPrisma } from "@/lib/prisma";
import { syncGoogleSource } from "./google";
import { syncMicrosoftSource } from "./microsoft";
import { syncIcsSource } from "./ics";
import { withRetry } from "./retry";
import type { CalendarSource } from "@prisma/client";

export async function syncSource(source: CalendarSource): Promise<void> {
  const prisma = await getPrisma();
  try {
    const result = await withRetry(() =>
      source.type === "GOOGLE"
        ? syncGoogleSource(source)
        : source.type === "MICROSOFT"
          ? syncMicrosoftSource(source)
          : syncIcsSource(source)
    );

    await prisma.$transaction([
      prisma.event.deleteMany({ where: { sourceId: source.id } }),
      prisma.event.createMany({
        data: result.events.map((event) => ({
          sourceId: source.id,
          externalId: event.externalId,
          title: event.title,
          description: event.description,
          location: event.location,
          start: event.start,
          end: event.end,
          allDay: event.allDay,
        })),
      }),
    ]);

    await prisma.calendarSource.update({
      where: { id: source.id },
      data: { lastSyncedAt: new Date(), lastSyncError: null },
    });
  } catch (error) {
    await prisma.calendarSource.update({
      where: { id: source.id },
      data: {
        lastSyncedAt: new Date(),
        lastSyncError: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

export async function syncAllSourcesForUser(userId: string): Promise<void> {
  const prisma = await getPrisma();
  const sources = await prisma.calendarSource.findMany({ where: { userId } });
  await Promise.all(
    sources.map((source) => syncSource(source).catch(() => undefined))
  );
}
