import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import { getPrisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const devBypassEnabled = process.env.AUTH_DEV_BYPASS === "true";
const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

// NextAuth's config is built fresh per request (rather than once at module
// scope) because the Prisma adapter needs a D1-backed client, and the D1
// binding is only reachable from inside a request's Cloudflare context.
export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const prisma = await getPrisma();

  return {
    adapter: PrismaAdapter(prisma),
    // Cloudflare Workers isn't auto-detected as a trusted host the way
    // Vercel is; the platform sets Host correctly from the real request, so
    // this is safe.
    trustHost: true,
    // Auth.js always issues a JWT session for the Credentials provider (used
    // only by the dev bypass below), regardless of this setting, so "database"
    // sessions would silently fail to be read back. Google/Microsoft accounts
    // still get linked via the Prisma adapter either way.
    session: { strategy: "jwt" },
    providers: [
      ...(devBypassEnabled
        ? [
            // Local-only bypass so the app can be tried without registering a
            // Google/Microsoft OAuth app first. Only active when
            // AUTH_DEV_BYPASS=true is set; never enable this in production.
            Credentials({
              id: "dev",
              name: "Dev bypass",
              credentials: {},
              async authorize() {
                return prisma.user.upsert({
                  where: { email: "dev@local.test" },
                  update: {},
                  create: { email: "dev@local.test", name: "Dev User" },
                });
              },
            }),
          ]
        : []),
      ...(googleEnabled
        ? [
            Google({
              authorization: {
                params: {
                  scope:
                    "openid email profile https://www.googleapis.com/auth/calendar.readonly",
                  access_type: "offline",
                  prompt: "consent",
                },
              },
            }),
          ]
        : []),
      MicrosoftEntraID({
        // "common" allows both personal Microsoft accounts and any work/school
        // account to sign in and consent for themselves, without an org admin.
        issuer: "https://login.microsoftonline.com/common/v2.0",
        authorization: {
          params: {
            // ReadWrite (not just Read) so the booking feature can create
            // Teams meetings on a connected Outlook calendar. Accounts
            // connected before this change need to reconnect to grant it.
            scope:
              "openid email profile offline_access Calendars.ReadWrite",
          },
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user && typeof token.id === "string") {
          session.user.id = token.id;
        }
        return session;
      },
    },
    events: {
      async signIn({ user }) {
        await writeAuditLog(prisma, {
          action: "SIGN_IN",
          userId: user.id,
          actorEmail: user.email ?? undefined,
        }).catch(() => undefined);
      },
    },
  };
});
