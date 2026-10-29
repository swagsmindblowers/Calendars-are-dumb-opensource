import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getPrisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

/**
 * Checks a per-IP rate limit on one of the public booking endpoints.
 * There's no stable per-booker identity on these routes (anyone can hit
 * them with just a username/slug/booking id), so IP is the only
 * practical key -- despite Cloudflare's own guidance against IP-only
 * keys for shared-IP cases, it's the right tradeoff here over no
 * protection at all.
 */
export async function checkRateLimit(
  binding: "BOOKING_READ_LIMITER" | "BOOKING_WRITE_LIMITER",
  key?: string
): Promise<boolean> {
  const { env } = await getCloudflareContext({ async: true });
  const h = await headers();
  const ip = h.get("cf-connecting-ip") ?? "unknown";
  const { success } = await env[binding].limit({ key: key ? `${ip}:${key}` : ip });
  if (!success) {
    const prisma = await getPrisma();
    await writeAuditLog(prisma, {
      action: "RATE_LIMITED",
      detail: `${binding} blocked ${ip}${key ? `:${key}` : ""}`,
    }).catch(() => undefined);
  }
  return success;
}
