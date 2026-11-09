import { Effect } from "effect";

import type { TikTokHosts } from "#shared/infrastructure/platforms/tiktok-api.ts";

import { fakeHttpServer, formOf, json } from "./fake-http-server.ts";
import type { FakeRequest, FakeResponse } from "./fake-http-server.ts";

/** Acme's synthetic TikTok app. */
export const tiktokClient = {
  clientKey: "awsyntheticclientkey",
  clientSecret: "synthetic-tiktok-secret",
} as const;

/** A synthetic creator, as GET /v2/user/info/ shows them. */
export const tiktokCreator = {
  avatar_url: "https://p16-sign.tiktokcdn.example/avatar/acme.jpeg",
  display_name: "Acme Example",
  open_id: "-000synthetic-open-id-0001",
  username: "acme_example",
} as const;

const granted = "user.info.basic,user.info.profile,video.publish,video.list";

const clientOf = (form: URLSearchParams) =>
  form.get("client_key") === tiktokClient.clientKey &&
  form.get("client_secret") === tiktokClient.clientSecret;

const bearerOf = (request: FakeRequest) =>
  String(request.headers["authorization"] ?? "").replace(/^Bearer /u, "");

/** The creator refuses: back with OAuth's `access_denied`. */
const deny = (authorizationUrl: string) => ({
  error: "access_denied",
  state: new URL(authorizationUrl).searchParams.get("state") ?? "",
});

interface PendingCode {
  readonly redirectUri: string;
}

const oauthError = (error: string, status = 400) =>
  json(
    {
      error,
      error_description: "Synthetic refusal.",
      log_id: "20261109000000SYNTHETIC0000000001",
    },
    status
  );

const v2Error = (code: string, status: number) =>
  json(
    {
      error: {
        code,
        log_id: "20261109000000SYNTHETIC0000000002",
        message: "Synthetic refusal.",
      },
    },
    status
  );

/**
 * TikTok's OAuth for one synthetic creator: it issues codes for the
 * authorization page (`approve` plays the creator), exchanges them with the
 * client's key and secret in the form, refreshes with refresh tokens that
 * work once, each answer bringing the next, and revokes access tokens.
 * `failNext` makes the next answers to a route failures.
 */
export const fakeTikTok = Effect.fnUntraced(function* fakeTikTok() {
  const codes = new Map<string, PendingCode>();
  const accessTokens = new Set<string>();
  const refreshTokens = new Set<string>();
  const usedRefreshTokens: string[] = [];
  const revoked: string[] = [];
  const failures = new Map<string, FakeResponse[]>();
  let issued = 0;
  let scope = granted;
  let username: string | undefined = tiktokCreator.username;

  const issue = () => {
    issued += 1;

    const access = `act.tiktok-access-${issued}`;
    const refresh = `rft.tiktok-refresh-${issued}`;

    accessTokens.add(access);
    refreshTokens.add(refresh);

    return json({
      access_token: access,
      expires_in: 86_400,
      open_id: tiktokCreator.open_id,
      refresh_expires_in: 15_552_000,
      refresh_token: refresh,
      scope,
      token_type: "Bearer",
    });
  };

  const exchange = (request: FakeRequest): FakeResponse => {
    const form = formOf(request);

    if (!clientOf(form)) {
      return oauthError("invalid_client", 401);
    }

    if (form.get("grant_type") === "refresh_token") {
      const token = form.get("refresh_token") ?? "";

      usedRefreshTokens.push(token);

      // TikTok answers a spent refresh token with an error, in a 200.
      return refreshTokens.delete(token)
        ? issue()
        : oauthError("invalid_grant", 200);
    }

    const code = codes.get(form.get("code") ?? "");

    if (
      form.get("grant_type") !== "authorization_code" ||
      code === undefined ||
      code.redirectUri !== form.get("redirect_uri")
    ) {
      return oauthError("invalid_grant");
    }

    codes.delete(form.get("code") ?? "");

    return issue();
  };

  const userInfo = (request: FakeRequest): FakeResponse => {
    if (!accessTokens.has(bearerOf(request))) {
      return v2Error("access_token_invalid", 401);
    }

    const fields = new Set((request.query.get("fields") ?? "").split(","));

    const user: Record<string, string> = {};

    for (const [field, value] of Object.entries({
      ...tiktokCreator,
      username,
    })) {
      if (fields.has(field) && value !== undefined) {
        user[field] = value;
      }
    }

    return json({
      data: { user },
      error: { code: "ok", log_id: "20261109000000SYNTHETIC", message: "" },
    });
  };

  const revoke = (request: FakeRequest): FakeResponse => {
    const form = formOf(request);

    if (!clientOf(form)) {
      return oauthError("invalid_client", 401);
    }

    const token = form.get("token") ?? "";

    revoked.push(token);
    accessTokens.delete(token);

    return json({});
  };

  const handle = (request: FakeRequest): FakeResponse => {
    const route = `${request.method} ${request.path}`;
    const failure = failures.get(route)?.shift();

    if (failure !== undefined) {
      return failure;
    }

    if (route === "POST /v2/oauth/token/") {
      return exchange(request);
    }

    if (route === "GET /v2/user/info/") {
      return userInfo(request);
    }

    if (route === "POST /v2/oauth/revoke/") {
      return revoke(request);
    }

    return v2Error("not_found", 404);
  };

  const server = yield* fakeHttpServer(handle);

  const hosts: TikTokHosts = {
    api: new URL(server.url),
    authorization: new URL("/v2/auth/authorize/", server.url),
  };

  /** The creator approves on the authorization page: back with a code. */
  const approve = (authorizationUrl: string) => {
    const url = new URL(authorizationUrl);
    const state = url.searchParams.get("state") ?? "";
    const code = `tiktok-code-${codes.size + 1}-${state.slice(0, 6)}`;

    codes.set(code, {
      redirectUri: url.searchParams.get("redirect_uri") ?? "",
    });

    return { code, state };
  };

  return {
    ...server,
    approve,
    deny,
    failNext: (route: string, answers: readonly FakeResponse[]) => {
      failures.set(route, [...(failures.get(route) ?? []), ...answers]);
    },
    /** Grants only these scopes from now on, as a creator who turned some off. */
    grantOnly: (scopes: readonly string[]) => {
      scope = scopes.join(",");

      if (!scopes.includes("user.info.profile")) {
        username = undefined;
      }
    },
    hosts,
    /** Revokes every token, as the creator would in TikTok's settings. */
    revokeAll: () => {
      accessTokens.clear();
      refreshTokens.clear();
    },
    /** The access tokens revoked, in order. */
    revoked: () => [...revoked],
    /** The refresh tokens sent, in order. */
    usedRefreshTokens: () => [...usedRefreshTokens],
  };
});
