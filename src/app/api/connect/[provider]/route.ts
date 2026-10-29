import { auth } from "@/auth";
import { signConnectState } from "@/lib/oauth/state";
import { CONNECT_PROVIDERS, isConnectProvider } from "@/lib/oauth/providers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  if (!isConnectProvider(provider)) {
    return new Response("Unknown provider", { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Not signed in", { status: 401 });
  }

  const config = CONNECT_PROVIDERS[provider];
  if (!config.clientId) {
    return new Response(`${provider} is not configured.`, { status: 500 });
  }

  const appUrl = process.env.APP_URL ?? "";
  const state = await signConnectState(session.user.id, provider);

  const params_ = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${appUrl}/api/connect/${provider}/callback`,
    response_type: "code",
    scope: config.scope,
    state,
    ...config.extraAuthorizeParams,
  });

  return Response.redirect(`${config.authorizeUrl}?${params_}`, 302);
}
