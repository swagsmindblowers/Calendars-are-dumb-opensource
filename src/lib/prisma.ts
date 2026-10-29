import { cache } from "react";
import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { encryptToken, decryptToken } from "./token-crypto";

// Loosely typed on purpose: Prisma's update input types allow access_token/
// refresh_token to be either a plain string or a nested
// `{ set: string }`-style operator object, which this app never actually
// uses (the adapter and our own code always pass plain strings) -- so we
// just check typeof at runtime and leave anything else untouched.
async function encryptAccountData<T extends Record<string, unknown>>(data: T): Promise<T> {
  const out: Record<string, unknown> = { ...data };
  if (typeof out.access_token === "string") {
    out.access_token = await encryptToken(out.access_token);
  }
  if (typeof out.refresh_token === "string") {
    out.refresh_token = await encryptToken(out.refresh_token);
  }
  return out as T;
}

async function decryptAccountRecord<T extends Record<string, unknown> | null>(
  record: T
): Promise<T> {
  if (!record) return record;
  const out: Record<string, unknown> = { ...record };
  if (typeof out.access_token === "string") {
    out.access_token = await decryptToken(out.access_token);
  }
  if (typeof out.refresh_token === "string") {
    out.refresh_token = await decryptToken(out.refresh_token);
  }
  return out as T;
}

// Cloudflare Workers don't allow reusing a connection/client across requests,
// and the D1 binding is only reachable from inside a request's Cloudflare
// context — so, unlike a typical Node server, this can't be a module-level
// singleton. `cache()` memoizes it for the lifetime of a single request.
//
// The returned client is extended to transparently encrypt/decrypt
// Account.access_token/refresh_token at rest -- this covers both our own
// token-refresh writes (sync/google.ts, sync/microsoft.ts) AND the
// NextAuth Prisma adapter's own account.create/update calls during
// sign-in, since those go through this same client. Cast back to
// PrismaClient: the extended client is a strict superset (same shape plus
// the hooks below), so every existing `prisma: PrismaClient` parameter
// across the codebase stays valid without touching those call sites.
export const getPrisma = cache(async (): Promise<PrismaClient> => {
  const { env } = await getCloudflareContext({ async: true });
  const adapter = new PrismaD1(env.DB);
  const base = new PrismaClient({ adapter });

  const extended = base.$extends({
    query: {
      account: {
        async create({ args, query }) {
          args.data = await encryptAccountData(args.data);
          return query(args);
        },
        async update({ args, query }) {
          if (args.data) args.data = await encryptAccountData(args.data);
          return query(args);
        },
        async upsert({ args, query }) {
          args.create = await encryptAccountData(args.create);
          if (args.update) args.update = await encryptAccountData(args.update);
          return query(args);
        },
        async findFirst({ args, query }) {
          return decryptAccountRecord(await query(args));
        },
        async findUnique({ args, query }) {
          return decryptAccountRecord(await query(args));
        },
        async findMany({ args, query }) {
          const results = await query(args);
          return Promise.all(results.map((r) => decryptAccountRecord(r)));
        },
      },
    },
  });

  return extended as unknown as PrismaClient;
});
