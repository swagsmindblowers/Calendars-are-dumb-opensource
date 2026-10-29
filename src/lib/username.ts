import type { PrismaClient } from "@prisma/client";

function slugifyLocalPart(email: string): string {
  const local = email.split("@")[0] ?? "user";
  const slug = local
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "user";
}

/**
 * Returns the user's public booking-link handle, generating and persisting
 * one from their email on first use if they don't have one yet. Booking
 * URLs are /book/<username>/<slug>, so this is what keeps two different
 * users' event types from colliding.
 */
export async function ensureUsername(
  prisma: PrismaClient,
  userId: string
): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.username) return user.username;

  const base = slugifyLocalPart(user.email ?? userId);
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { username: candidate },
      });
      return candidate;
    } catch (err) {
      // P2002: unique constraint failed -- someone already has this handle.
      const isUniqueConflict =
        typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
      if (!isUniqueConflict) throw err;
    }
  }
  throw new Error("Could not generate a unique username.");
}
