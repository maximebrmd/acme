import { createHash } from "node:crypto";

import { Effect } from "effect";

import type { XEndpoints } from "#channels/infrastructure/platforms/x/x-authorizer.ts";

import { fakeHttpServer, formOf, json } from "./fake-http-server.ts";
import type { FakeRequest, FakeResponse } from "./fake-http-server.ts";

/** Peal's synthetic X app. */
export const xClient = {
  clientId: "c3ludGhldGljLWNsaWVudA",
  clientSecret: "synthetic-x-secret",
} as const;

/** A synthetic account, as GET /2/users/me shows it. */
export const xAccount = {
  id: "1460000000000000001",
  name: "Peal Example",
  profile_image_url:
    "https://pbs.twimg.example/profile_images/1/peal_normal.jpg",
  username: "peal_example",
} as const;

const scopes = "tweet.read tweet.write users.read media.write offline.access";

/** The owner refuses: back with OAuth's `access_denied`. */
const deny = (authorizationUrl: string) => ({
  error: "access_denied",
  state: new URL(authorizationUrl).searchParams.get("state") ?? "",
});

interface PendingCode {
  readonly challenge: string;
  readonly redirectUri: string;
}

const base64Url = (bytes: Buffer) => bytes.toString("base64url");

const basicAuth = `Basic ${Buffer.from(
  `${xClient.clientId}:${xClient.clientSecret}`
).toString("base64")}`;

/**
 * X's OAuth 2 for one synthetic account: it issues codes for the
 * authorization page (`approve` plays the owner), exchanges them with PKCE
 * and the client's Basic credentials, and refreshes with refresh tokens
 * that work once, each answer bringing the next. `failNext` makes the next
 * answers to a route failures.
 */
export const fakeX = Effect.fnUntraced(function* fakeX() {
  const codes = new Map<string, PendingCode>();
  const accessTokens = new Set<string>();
  const refreshTokens = new Set<string>();
  const usedRefreshTokens: string[] = [];
  const failures = new Map<string, FakeResponse[]>();
  let issued = 0;

  const issue = () => {
    issued += 1;

    const access = `x-access-${issued}`;
    const refresh = `x-refresh-${issued}`;

    accessTokens.add(access);
    refreshTokens.add(refresh);

    return json({
      access_token: access,
      expires_in: 7200,
      refresh_token: refresh,
      scope: scopes,
      token_type: "bearer",
    });
  };

  const invalidToken = json(
    {
      error: "invalid_request",
      error_description: "Value passed for the token was invalid.",
    },
    400
  );

  const exchange = (request: FakeRequest): FakeResponse => {
    const form = formOf(request);

    if (request.headers["authorization"] !== basicAuth) {
      return json(
        {
          error: "unauthorized_client",
          error_description: "Missing valid authorization header",
        },
        401
      );
    }

    if (form.get("grant_type") === "refresh_token") {
      const token = form.get("refresh_token") ?? "";

      usedRefreshTokens.push(token);

      if (!refreshTokens.delete(token)) {
        return invalidToken;
      }

      return issue();
    }

    const code = codes.get(form.get("code") ?? "");
    const verifier = form.get("code_verifier") ?? "";

    if (
      code === undefined ||
      code.redirectUri !== form.get("redirect_uri") ||
      code.challenge !==
        base64Url(createHash("sha256").update(verifier).digest())
    ) {
      return invalidToken;
    }

    codes.delete(form.get("code") ?? "");

    return issue();
  };

  const handle = (request: FakeRequest): FakeResponse => {
    const route = `${request.method} ${request.path}`;
    const failure = failures.get(route)?.shift();

    if (failure !== undefined) {
      return failure;
    }

    if (route === "POST /2/oauth2/token") {
      return exchange(request);
    }

    if (route === "GET /2/users/me") {
      const token = String(request.headers["authorization"] ?? "").replace(
        /^Bearer /u,
        ""
      );

      return accessTokens.has(token)
        ? json({ data: xAccount })
        : json(
            { status: 401, title: "Unauthorized", type: "about:blank" },
            401
          );
    }

    return json({ status: 404, title: "Not Found Error" }, 404);
  };

  const server = yield* fakeHttpServer(handle);

  const endpoints: XEndpoints = {
    api: new URL(server.url),
    authorization: new URL("/i/oauth2/authorize", server.url),
  };

  /** The owner approves on the authorization page: back with a code. */
  const approve = (authorizationUrl: string) => {
    const url = new URL(authorizationUrl);
    const state = url.searchParams.get("state") ?? "";
    const code = `x-code-${codes.size + 1}-${state.slice(0, 6)}`;

    codes.set(code, {
      challenge: url.searchParams.get("code_challenge") ?? "",
      redirectUri: url.searchParams.get("redirect_uri") ?? "",
    });

    return { code, state };
  };

  return {
    ...server,
    approve,
    deny,
    endpoints,
    failNext: (route: string, answers: readonly FakeResponse[]) => {
      failures.set(route, [...(failures.get(route) ?? []), ...answers]);
    },
    /** Revokes every token, as the owner would in X's settings. */
    revokeAll: () => {
      accessTokens.clear();
      refreshTokens.clear();
    },
    /** The refresh tokens sent, in order. */
    usedRefreshTokens: () => [...usedRefreshTokens],
  };
});
