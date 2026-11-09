import { Effect, Redacted } from "effect";

import type { MetaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";

import { fakeHttpServer, formOf, json } from "./fake-http-server.ts";
import type { FakeRequest, FakeResponse } from "./fake-http-server.ts";
import { instagramApp } from "./fake-meta.ts";

/** A synthetic professional account, as Instagram Login's `/me` shows it. */
export const instagramAccount = {
  // The app-scoped id of the app's user.
  id: "26000000000000001",
  name: "Studio Example",
  profile_picture_url: "https://cdn.instagram.example/studio.jpg",
  // The professional account's own id.
  user_id: "17841400000000077",
  username: "studio_example",
} as const;

/** Every permission Business Login for Instagram can grant Peal. */
export const instagramPermissions = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_insights",
] as const;

export interface FakeInstagramOptions {
  /**
   * Answers the code exchange flat, with the permissions as an array, as
   * Instagram does besides the `data` list its page shows.
   */
  readonly flatGrant?: boolean;
}

const oauthError = (code: number, status = 400): FakeResponse =>
  json(
    {
      code,
      error_message: "Matching code was not found or was already used",
      error_type: "OAuthException",
    },
    status
  );

const graphError = (code: number, status = 400): FakeResponse =>
  json(
    { error: { code, message: "synthetic", type: "OAuthException" } },
    status
  );

/**
 * Business Login for Instagram and the Instagram API with Instagram Login
 * on one loopback server, as `www.instagram.com`, `api.instagram.com` and
 * `graph.instagram.com` answer them: the authorization page (`approve`
 * plays the member), the code exchange, the long-lived token exchange, its
 * refresh, and the profile.
 */
export const fakeInstagram = Effect.fnUntraced(function* fakeInstagram(
  options: FakeInstagramOptions = {}
) {
  const codes = new Map<string, string>();
  const shortLived = new Set<string>();
  const longLived = new Set<string>();
  const revoked = new Set<string>();
  let issued = 0;
  let granted: readonly string[] = instagramPermissions;

  const issue = (tokens: Set<string>, prefix: string) => {
    issued += 1;

    const token = `${prefix}-${issued}`;

    tokens.add(token);

    return token;
  };

  const working = (token: string | null) =>
    longLived.has(token ?? "") && !revoked.has(token ?? "");

  const codeExchange = (request: FakeRequest): FakeResponse => {
    const form = formOf(request);
    const code = form.get("code") ?? "";
    const redirect = codes.get(code);

    codes.delete(code);

    if (
      form.get("client_id") !== instagramApp.appId ||
      form.get("client_secret") !== Redacted.value(instagramApp.appSecret) ||
      form.get("grant_type") !== "authorization_code" ||
      redirect === undefined ||
      redirect !== form.get("redirect_uri")
    ) {
      return oauthError(400);
    }

    const grant = {
      access_token: issue(shortLived, "ig-short"),
      user_id: instagramAccount.user_id,
    };

    return options.flatGrant === true
      ? json({ ...grant, permissions: [...granted] })
      : json({ data: [{ ...grant, permissions: granted.join(",") }] });
  };

  const long = (prefix: string) =>
    json({
      access_token: issue(longLived, prefix),
      expires_in: 5_183_944,
      token_type: "bearer",
    });

  const exchange = ({ query }: FakeRequest): FakeResponse =>
    query.get("grant_type") === "ig_exchange_token" &&
    query.get("client_secret") === Redacted.value(instagramApp.appSecret) &&
    shortLived.has(query.get("access_token") ?? "")
      ? long("ig-long")
      : graphError(190);

  const refresh = ({ query }: FakeRequest): FakeResponse =>
    query.get("grant_type") === "ig_refresh_token" &&
    working(query.get("access_token"))
      ? long("ig-refreshed")
      : graphError(190);

  const me = ({ query }: FakeRequest): FakeResponse => {
    if (!working(query.get("access_token"))) {
      return graphError(190);
    }

    const fields = (query.get("fields") ?? "").split(",");

    return json(
      Object.fromEntries(
        Object.entries(instagramAccount).filter(([field]) =>
          fields.includes(field)
        )
      )
    );
  };

  const routes = new Map<string, (request: FakeRequest) => FakeResponse>([
    ["GET /access_token", exchange],
    ["GET /refresh_access_token", refresh],
    ["GET /v27.0/me", me],
    ["POST /oauth/access_token", codeExchange],
  ]);

  const server = yield* fakeHttpServer(
    (request) =>
      routes.get(`${request.method} ${request.path}`)?.(request) ??
      graphError(803, 404)
  );

  /** The member approves on the authorization page: back with a code. */
  const approve = (authorizationUrl: string) => {
    const url = new URL(authorizationUrl);
    const state = url.searchParams.get("state") ?? "";
    const code = `ig-code-${codes.size + 1}-${state.slice(0, 6)}`;

    codes.set(code, url.searchParams.get("redirect_uri") ?? "");

    // Instagram may end the code with `#_`.
    return { code: `${code}#_`, state };
  };

  /** Every Meta host, with Instagram's at this fake. */
  const hostsOver = (hosts: MetaHosts): MetaHosts => ({
    ...hosts,
    instagramApi: new URL(server.url),
    instagramAuthorize: new URL(server.url),
    instagramGraph: new URL(server.url),
  });

  return {
    ...server,
    approve,
    hostsOver,
    /** Instagram stops taking the token, as when the user removes the app. */
    revoke: (token: string) => {
      revoked.add(token);
    },
    /** The permissions the member grants from now on. */
    setGranted: (next: readonly string[]) => {
      granted = next;
    },
  };
});
