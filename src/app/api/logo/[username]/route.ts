import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  if (!(await checkRateLimit("BOOKING_READ_LIMITER"))) {
    return new Response("Too many requests", { status: 429 });
  }

  const { username } = await params;
  const prisma = await getPrisma();
  const user = await prisma.user.findUnique({
    where: { username },
    select: { logoKey: true, logoContentType: true },
  });
  if (!user?.logoKey) {
    return new Response("Not found", { status: 404 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const object = await env.LOGOS.get(user.logoKey);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": user.logoContentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=300",
    },
  });
}
