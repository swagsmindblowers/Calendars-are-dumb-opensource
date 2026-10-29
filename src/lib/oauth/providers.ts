export type ConnectProvider = "google" | "microsoft-entra-id";

export const CONNECT_PROVIDERS: Record<
  ConnectProvider,
  {
    authorizeUrl: string;
    tokenUrl: string;
    scope: string;
    extraAuthorizeParams: Record<string, string>;
    clientId: string | undefined;
    clientSecret: string | undefined;
  }
> = {
  google: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email profile https://www.googleapis.com/auth/calendar.readonly",
    // select_account lets the user pick a different Google account than the
    // one already signed into the browser; consent (together with
    // access_type=offline) guarantees a fresh refresh_token every time,
    // even if this exact account was authorized before.
    extraAuthorizeParams: { access_type: "offline", prompt: "select_account consent" },
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
  },
  "microsoft-entra-id": {
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "openid email profile offline_access Calendars.ReadWrite",
    extraAuthorizeParams: { prompt: "select_account" },
    clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
    clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
  },
};

export function isConnectProvider(value: string): value is ConnectProvider {
  return value === "google" || value === "microsoft-entra-id";
}
