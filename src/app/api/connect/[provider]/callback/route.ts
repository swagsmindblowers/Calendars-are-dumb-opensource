import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { verifyConnectState } from "@/lib/oauth/state";
import { CONNECT_PROVIDERS, isConnectProvider } from "@/lib/oauth/providers";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type?: string;
  scope?: string;
};

async function fetchIdentity(
  provider: "google" | "microsoft-entra-id",
  accessToken: string
): Promise<{ providerAccountId: string; email: string | null }> {
  if (provider === "google") {
    const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Failed to fetch Google profile: ${await res.text()}`);
    const json = (await res.json()) as { sub: string; email?: string };
    return { providerAccountId: json.sub, email: json.email ?? null };
  }

  const res = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch Microsoft profile: ${await res.text()}`);
  const json = (await res.json()) as {
    id: string;
    mail?: string | null;
    userPrincipalName?: string;
  };
  return { providerAccountId: json.id, email: json.mail ?? json.userPrincipalName ?? null };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  if (!isConnectProvider(provider)) {
    return new Response("Unknown provider", { status: 404 });
  }

  const appUrl = process.env.APP_URL ?? "";
  const { searchParams } = new URL(request.url);

  const oauthError = searchParams.get("error");
  if (oauthError) {
    return Response.redirect(`${appUrl}/sources?connectError=cancelled`, 302);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return new Response("Missing code or state", { status: 400 });
  }

  const verified = await verifyConnectState(state);
  if (!verified || verified.provider !== provider) {
    return new Response("Invalid or expired request. Please try connecting again.", {
      status: 403,
    });
  }

  const session = await auth();
  if (!session?.user?.id || session.user.id !== verified.userId) {
    return new Response("Session mismatch. Please sign in and try again.", { status: 403 });
  }

  const config = CONNECT_PROVIDERS[provider];
  if (!config.clientId || !config.clientSecret) {
    return new Response(`${provider} is not configured.`, { status: 500 });
  }

  const tokenRes = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${appUrl}/api/connect/${provider}/callback`,
    }),
  });
  if (!tokenRes.ok) {
    return new Response(`Failed to exchange code: ${await tokenRes.text()}`, { status: 502 });
  }
  const tokens = (await tokenRes.json()) as TokenResponse;

  const identity = await fetchIdentity(provider, tokens.access_token);

  const prisma = await getPrisma();
  const existing = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId: identity.providerAccountId } },
  });
  if (existing && existing.userId !== session.user.id) {
    return new Response("This account is already connected to a different user.", {
      status: 409,
    });
  }

  const data = {
    userId: session.user.id,
    type: "oauth",
    provider,
    providerAccountId: identity.providerAccountId,
    email: identity.email,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? existing?.refresh_token ?? null,
    expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
    token_type: tokens.token_type ?? null,
    scope: tokens.scope ?? config.scope,
  };

  if (existing) {
    await prisma.account.update({ where: { id: existing.id }, data });
  } else {
    await prisma.account.create({ data });
  }

  return Response.redirect(`${appUrl}/sources?connected=${provider}`, 302);
}
