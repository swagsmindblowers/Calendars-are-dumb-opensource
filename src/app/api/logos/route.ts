import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);
const MAX_BYTES = 2 * 1024 * 1024;

// The browser-supplied Content-Type (file.type) is just a label the
// client attaches -- it can be spoofed. Confirm the actual bytes match
// the declared type before trusting it.
function matchesDeclaredType(bytes: Uint8Array, declaredType: string): boolean {
  switch (declaredType) {
    case "image/png":
      return (
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
      );
    case "image/jpeg":
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/webp":
      return (
        bytes.length >= 12 &&
        bytes[0] === 0x52 && // R
        bytes[1] === 0x49 && // I
        bytes[2] === 0x46 && // F
        bytes[3] === 0x46 && // F
        bytes[8] === 0x57 && // W
        bytes[9] === 0x45 && // E
        bytes[10] === 0x42 && // B
        bytes[11] === 0x50 // P
      );
    case "image/svg+xml": {
      const head = new TextDecoder().decode(bytes.slice(0, 256)).trimStart().toLowerCase();
      return head.startsWith("<?xml") || head.startsWith("<svg");
    }
    default:
      return false;
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("logo");
  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json(
      { ok: false, error: "Use PNG, JPEG, WebP, or SVG." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ ok: false, error: "Logo must be under 2MB." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesDeclaredType(bytes, file.type)) {
    return Response.json(
      { ok: false, error: "File content doesn't match its declared type." },
      { status: 400 }
    );
  }

  const { env } = await getCloudflareContext({ async: true });
  const userId = session.user.id;
  const key = `logos/${userId}`;
  await env.LOGOS.put(key, bytes, {
    httpMetadata: { contentType: file.type },
  });

  const prisma = await getPrisma();
  await prisma.user.update({
    where: { id: userId },
    data: { logoKey: key, logoContentType: file.type },
  });

  revalidatePath("/settings");
  revalidatePath("/u/[username]", "page");
  revalidatePath("/book/[username]/[slug]", "page");

  return Response.json({ ok: true });
}
