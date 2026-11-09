import { createHash } from "node:crypto";

import { Effect } from "effect";

import type { YouTubeEndpoints } from "#channels/infrastructure/platforms/youtube/youtube-authorizer.ts";

import { fakeHttpServer, formOf, json } from "./fake-http-server.ts";
import type {
  FakeRequest,
  FakeResponse,
  JsonValue,
} from "./fake-http-server.ts";

/** Peal's synthetic Google OAuth client. */
export const googleClient = {
  clientId: "1234-synthetic.apps.googleusercontent.example",
  clientSecret: "synthetic-google-secret",
} as const;

const upload = "https://www.googleapis.com/auth/youtube.upload";

const readonly = "https://www.googleapis.com/auth/youtube.readonly";

/** A synthetic channel, as channels.list shows it. */
export const youtubeChannel = {
  id: "UCsyntheticChannel000001",
  snippet: {
    customUrl: "@pealexample",
    thumbnails: {
      default: { url: "https://yt3.ggpht.example/synthetic-avatar=s88" },
    },
    title: "Peal Example",
  },
} as const;

/** A second synthetic channel, for a sign-in that reaches two. */
export const otherYouTubeChannel = {
  id: "UCsyntheticChannel000002",
  snippet: { title: "Peal Example Clips" },
} as const;

interface PendingCode {
  readonly challenge: string;
  readonly redirectUri: string;
  readonly scope: string;
}

const base64Url = (bytes: Buffer) => bytes.toString("base64url");

const withClient = (form: URLSearchParams) =>
  form.get("client_id") === googleClient.clientId &&
  form.get("client_secret") === googleClient.clientSecret;

const bearerOf = (request: FakeRequest) =>
  String(request.headers["authorization"] ?? "").replace(/^Bearer /u, "");

const invalidGrant = json(
  { error: "invalid_grant", error_description: "Bad Request" },
  400
);

/**
 * Google's OAuth 2.0 and the YouTube Data API's channels.list for synthetic
 * channels: it issues codes for the consent page (`approve` plays the
 * owner, granting every scope asked or some), exchanges them with PKCE and
 * the client's secret in the form, refreshes with refresh tokens that keep
 * working, revokes tokens, and lists the channels the token signs in as
 * (`channels`, the synthetic one by default). `failNext` makes the next
 * answers to a route failures.
 */
export const fakeGoogle = Effect.fnUntraced(function* fakeGoogle() {
  const codes = new Map<string, PendingCode>();
  const accessTokens = new Set<string>();
  const refreshTokens = new Set<string>();
  const revoked: string[] = [];
  const failures = new Map<string, FakeResponse[]>();
  let channels: readonly JsonValue[] = [youtubeChannel];
  let issued = 0;

  const access = (scope: string) => {
    issued += 1;

    const token = `ya29.synthetic-${issued}`;

    accessTokens.add(token);

    return {
      access_token: token,
      expires_in: 3599,
      scope,
      token_type: "Bearer",
    };
  };

  const exchange = (request: FakeRequest): FakeResponse => {
    const form = formOf(request);

    if (!withClient(form)) {
      return json(
        { error: "invalid_client", error_description: "Unauthorized" },
        401
      );
    }

    if (form.get("grant_type") === "refresh_token") {
      return refreshTokens.has(form.get("refresh_token") ?? "")
        ? json(access(`${upload} ${readonly}`))
        : invalidGrant;
    }

    const code = codes.get(form.get("code") ?? "");
    const verifier = form.get("code_verifier") ?? "";

    if (
      code === undefined ||
      code.redirectUri !== form.get("redirect_uri") ||
      code.challenge !==
        base64Url(createHash("sha256").update(verifier).digest())
    ) {
      return invalidGrant;
    }

    codes.delete(form.get("code") ?? "");

    const refresh = `1//synthetic-refresh-${issued + 1}`;

    refreshTokens.add(refresh);

    return json({ ...access(code.scope), refresh_token: refresh });
  };

  const handle = (request: FakeRequest): FakeResponse => {
    const route = `${request.method} ${request.path}`;
    const failure = failures.get(route)?.shift();

    if (failure !== undefined) {
      return failure;
    }

    if (route === "POST /token") {
      return exchange(request);
    }

    if (route === "POST /revoke") {
      const token = formOf(request).get("token") ?? "";

      if (!refreshTokens.delete(token) && !accessTokens.delete(token)) {
        return json({ error: "invalid_token" }, 400);
      }

      revoked.push(token);
      accessTokens.clear();

      return { status: 200 };
    }

    if (route === "GET /youtube/v3/channels") {
      if (!accessTokens.has(bearerOf(request))) {
        return json(
          { error: { code: 401, message: "Invalid Credentials" } },
          401
        );
      }

      return json({ items: channels, kind: "youtube#channelListResponse" });
    }

    return json({ error: { code: 404, message: "Not Found" } }, 404);
  };

  const server = yield* fakeHttpServer(handle);

  const endpoints: YouTubeEndpoints = {
    api: new URL(server.url),
    authorization: new URL("/o/oauth2/v2/auth", server.url),
    revocation: new URL("/revoke", server.url),
    token: new URL("/token", server.url),
  };

  /**
   * The owner agrees on the consent page, granting the scopes asked, or
   * only `scopes` when they untick some: back with a code.
   */
  const approve = (authorizationUrl: string, scopes?: readonly string[]) => {
    const url = new URL(authorizationUrl);
    const state = url.searchParams.get("state") ?? "";
    const code = `4/synthetic-code-${codes.size + 1}-${state.slice(0, 6)}`;

    codes.set(code, {
      challenge: url.searchParams.get("code_challenge") ?? "",
      redirectUri: url.searchParams.get("redirect_uri") ?? "",
      scope: scopes?.join(" ") ?? url.searchParams.get("scope") ?? "",
    });

    return { code, state };
  };

  return {
    ...server,
    approve,
    /** The owner cancels on the consent page. */
    deny: (authorizationUrl: string) => ({
      error: "access_denied",
      state: new URL(authorizationUrl).searchParams.get("state") ?? "",
    }),
    endpoints,
    failNext: (route: string, answers: readonly FakeResponse[]) => {
      failures.set(route, [...(failures.get(route) ?? []), ...answers]);
    },
    /** Revokes every token, as the owner would in their Google account. */
    revokeAll: () => {
      accessTokens.clear();
      refreshTokens.clear();
    },
    /** The tokens revoked through the revocation endpoint, in order. */
    revoked: () => [...revoked],
    /** The channels the next sign-ins reach. */
    setChannels: (next: readonly JsonValue[]) => {
      channels = next;
    },
  };
});
