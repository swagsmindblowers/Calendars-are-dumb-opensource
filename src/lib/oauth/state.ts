// Signs/verifies the `state` param for the "connect another account" OAuth
// flow (src/app/api/connect/[provider]). HMAC-SHA256 over the payload using
// AUTH_SECRET, base64url-encoded -- same "no extra crypto dependency" style
// as src/lib/token-crypto.ts. This is the CSRF/session-fixation defense: the
// callback requires the *current* session's userId to match the state's
// embedded userId, so a replayed or forged state can't attach an account to
// someone else's session.

const STATE_TTL_MS = 10 * 60_000; // 10 minutes

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (padded.length % 4)) % 4);
  return Uint8Array.from(atob(padded + padding), (c) => c.charCodeAt(0));
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signConnectState(userId: string, provider: string): Promise<string> {
  const payload = JSON.stringify({ userId, provider, iat: Date.now() });
  const payloadB64 = toBase64Url(new TextEncoder().encode(payload));
  const key = await getKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const sigB64 = toBase64Url(new Uint8Array(signature));
  return `${payloadB64}.${sigB64}`;
}

export async function verifyConnectState(
  state: string
): Promise<{ userId: string; provider: string } | null> {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;

  try {
    const key = await getKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(sigB64) as BufferSource,
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64))) as {
      userId: string;
      provider: string;
      iat: number;
    };
    if (Date.now() - payload.iat > STATE_TTL_MS) return null;

    return { userId: payload.userId, provider: payload.provider };
  } catch {
    return null;
  }
}
