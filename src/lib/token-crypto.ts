// AES-256-GCM encryption for OAuth tokens at rest, using the Workers runtime's
// native Web Crypto (no polyfill needed). TOKEN_ENCRYPTION_KEY is a base64-
// encoded 32-byte key, set as a Worker secret.
//
// decryptToken is tolerant of legacy plaintext: rows written before this
// feature shipped aren't our ciphertext format, so a decrypt failure falls
// back to returning the original string as-is rather than throwing. Those
// tokens become encrypted naturally the next time they're refreshed and
// written back (see getFreshAccessToken in sync/google.ts and sync/microsoft.ts).

const IV_BYTES = 12;

async function getKey(): Promise<CryptoKey> {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not set.");
  }
  const keyBytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): BufferSource {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0)) as BufferSource;
}

export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return `${toBase64(iv)}.${toBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptToken(value: string): Promise<string> {
  const parts = value.split(".");
  if (parts.length !== 2) return value; // not our format -- legacy plaintext

  try {
    const [ivPart, ciphertextPart] = parts;
    const key = await getKey();
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(ivPart) },
      key,
      fromBase64(ciphertextPart)
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    return value; // legacy plaintext that happened to contain a "."
  }
}
