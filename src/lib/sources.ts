"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { syncSource } from "@/lib/sync";
import type { CalendarSourceType } from "@prisma/client";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not signed in.");
  }
  return session.user.id;
}

const DEFAULT_COLORS: Record<CalendarSourceType, string> = {
  GOOGLE: "#4285f4",
  MICROSOFT: "#0078d4",
  ICS: "#16a34a",
};

export async function connectOAuthCalendar(
  provider: "google" | "microsoft-entra-id",
  providerAccountId: string,
  label: string
) {
  const userId = await requireUserId();
  const prisma = await getPrisma();
  const account = await prisma.account.findFirst({
    where: { userId, provider, providerAccountId },
  });
  if (!account) {
    throw new Error(`That ${provider} account isn't connected to your session.`);
  }

  const type: CalendarSourceType = provider === "google" ? "GOOGLE" : "MICROSOFT";
  const source = await prisma.calendarSource.create({
    data: {
      userId,
      type,
      label,
      color: DEFAULT_COLORS[type],
      providerAccountId: account.providerAccountId,
    },
  });

  await syncSource(source).catch(() => undefined);
  revalidatePath("/sources");
  revalidatePath("/");
}

export async function addIcsSource(label: string, icsUrl: string) {
  const userId = await requireUserId();
  if (!icsUrl.trim()) {
    throw new Error("ICS URL is required.");
  }
  const prisma = await getPrisma();

  const source = await prisma.calendarSource.create({
    data: {
      userId,
      type: "ICS",
      label: label.trim() || "Calendar feed",
      color: DEFAULT_COLORS.ICS,
      icsUrl: icsUrl.trim(),
    },
  });

  await syncSource(source).catch(() => undefined);
  revalidatePath("/sources");
  revalidatePath("/");
}

export async function removeSource(sourceId: string) {
  const userId = await requireUserId();
  const prisma = await getPrisma();
  await prisma.calendarSource.deleteMany({ where: { id: sourceId, userId } });
  revalidatePath("/sources");
  revalidatePath("/");
}

export async function resyncSource(sourceId: string) {
  const userId = await requireUserId();
  const prisma = await getPrisma();
  const source = await prisma.calendarSource.findFirst({
    where: { id: sourceId, userId },
  });
  if (!source) return;
  await syncSource(source).catch(() => undefined);
  revalidatePath("/sources");
  revalidatePath("/");
}
