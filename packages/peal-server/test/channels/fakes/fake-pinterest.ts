import { Effect } from "effect";

import type { PinterestHosts } from "#shared/infrastructure/platforms/pinterest-api.ts";

import { fakeHttpServer, formOf, json } from "./fake-http-server.ts";
import type { FakeRequest, FakeResponse } from "./fake-http-server.ts";

/** Peal's synthetic Pinterest app. */
export const pinterestClient = {
  appId: "1500000",
  appSecret: "synthetic-pinterest-secret",
} as const;

/** A synthetic account, as GET /v5/user_account shows it. */
export const pinterestAccount = {
  account_type: "BUSINESS",
  business_name: "Peal Example",
  id: "549755885175",
  profile_image: "https://i.pinimg.example/600x600_R/synthetic/avatar.jpg",
  username: "pealexample",
} as const;

const scopes =
  "boards:read,boards:write,pins:read,pins:write,user_accounts:read";

interface PendingCode {
  readonly redirectUri: string;
  readonly scope: string;
}

const basicAuth = `Basic ${Buffer.from(
  `${pinterestClient.appId}:${pinterestClient.appSecret}`
).toString("base64")}`;

const bearerOf = (request: FakeRequest) =>
  String(request.headers["authorization"] ?? "").replace(/^Bearer /u, "");

// Pinterest's refusals: a numeric code and a message.
const authenticationFailed = json(
  { code: 2, message: "Authentication failed." },
  401
);

const invalidGrant = json({ code: 1, message: "Invalid request." }, 400);

/**
 * Pinterest's OAuth 2 for one synthetic account, from its "Set up
 * authentication and authorization" guide: the authorization page gives a
 * code (`approve` plays the owner), POST /v5/oauth/token exchanges it with
 * the app's id and secret as Basic credentials, and answers an access
 * token of 30 days with a continuous refresh token of 60, which a refresh
 * renews, each answer bringing the next. `failNext` makes the next answers
 * to a route failures.
 */
export const fakePinterest = Effect.fnUntraced(function* fakePinterest() {
  const codes = new Map<string, PendingCode>();
  const accessTokens = new Set<string>();
  const refreshTokens = new Set<string>();
  const usedRefreshTokens: string[] = [];
  const failures = new Map<string, FakeResponse[]>();
  let issued = 0;

  const issue = (scope: string, grant: string) => {
    issued += 1;

    const access = `pina_synthetic_${issued}`;
    const refresh = `pinr_synthetic_${issued}`;

    accessTokens.add(access);
    refreshTokens.add(refresh);

    return json({
      access_token: access,
      expires_in: 2_592_000,
      refresh_token: refresh,
      refresh_token_expires_in: 5_184_000,
      response_type: grant,
      scope,
      token_type: "bearer",
    });
  };

  const exchange = (request: FakeRequest): FakeResponse => {
    const form = formOf(request);

    if (request.headers["authorization"] !== basicAuth) {
      return authenticationFailed;
    }

    if (form.get("grant_type") === "refresh_token") {
      const token = form.get("refresh_token") ?? "";

      usedRefreshTokens.push(token);

      return refreshTokens.delete(token)
        ? issue(scopes, "refresh_token")
        : invalidGrant;
    }

    const code = codes.get(form.get("code") ?? "");

    if (code === undefined || code.redirectUri !== form.get("redirect_uri")) {
      return invalidGrant;
    }

    codes.delete(form.get("code") ?? "");

    return issue(code.scope, "authorization_code");
  };

  const handle = (request: FakeRequest): FakeResponse => {
    const route = `${request.method} ${request.path}`;
    const failure = failures.get(route)?.shift();

    if (failure !== undefined) {
      return failure;
    }

    if (route === "POST /v5/oauth/token") {
      return exchange(request);
    }

    if (route === "GET /v5/user_account") {
      return accessTokens.has(bearerOf(request))
        ? json(pinterestAccount)
        : authenticationFailed;
    }

    return json({ code: 404, message: "Not found" }, 404);
  };

  const server = yield* fakeHttpServer(handle);

  const hosts: PinterestHosts = {
    api: new URL(server.url),
    authorization: new URL("/oauth/", server.url),
  };

  /**
   * The owner agrees on the authorization page, granting the scopes asked,
   * or only `granted`: back with a code.
   */
  const approve = (authorizationUrl: string, granted?: string) => {
    const url = new URL(authorizationUrl);
    const state = url.searchParams.get("state") ?? "";
    const code = `pinterest-code-${codes.size + 1}-${state.slice(0, 6)}`;

    codes.set(code, {
      redirectUri: url.searchParams.get("redirect_uri") ?? "",
      scope: granted ?? url.searchParams.get("scope") ?? "",
    });

    return { code, state };
  };

  return {
    ...server,
    approve,
    /** The owner cancels on the authorization page. */
    deny: (authorizationUrl: string) => ({
      error: "access_denied",
      state: new URL(authorizationUrl).searchParams.get("state") ?? "",
    }),
    failNext: (route: string, answers: readonly FakeResponse[]) => {
      failures.set(route, [...(failures.get(route) ?? []), ...answers]);
    },
    hosts,
    /** Revokes every token, as the owner would in Pinterest's settings. */
    revokeAll: () => {
      accessTokens.clear();
      refreshTokens.clear();
    },
    /** The refresh tokens sent, in order. */
    usedRefreshTokens: () => [...usedRefreshTokens],
  };
});
