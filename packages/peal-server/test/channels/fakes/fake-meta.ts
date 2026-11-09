import { createHmac } from "node:crypto";

import { Effect, Redacted } from "effect";

import type { MetaApp } from "#shared/infrastructure/platforms/meta-apps.ts";
import type { MetaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";

import { fakeHttpServer, formOf, json } from "./fake-http-server.ts";
import type {
  FakeRequest,
  FakeResponse,
  JsonValue,
} from "./fake-http-server.ts";

/** Meta's main app and its Threads credentials, for tests only. */
export const metaApp: MetaApp = {
  appId: "1234567890",
  appSecret: Redacted.make("synthetic-meta-secret"),
};

export const threadsApp: MetaApp = {
  appId: "9876543210",
  appSecret: Redacted.make("synthetic-threads-secret"),
};

/** The Facebook user who signs in, as Meta scopes their id to the app. */
export const facebookUserId = "10220000000000001";

/** A synthetic Page, with its token and possibly an Instagram account. */
export interface FakePage {
  readonly id: string;
  readonly instagram?: {
    readonly id: string;
    readonly name?: string;
    readonly username: string;
  };
  readonly name: string;
  readonly tasks?: readonly string[];
  readonly username?: string;
}

export const pageToken = (page: FakePage) => `page-token-${page.id}`;

/** A synthetic Threads account. */
export const threadsAccount = {
  id: "25000000000000001",
  name: "Alice Example",
  threads_profile_picture_url: "https://cdn.threads.example/alice.jpg",
  username: "alice_example",
} as const;

export interface FakeMetaOptions {
  /** How many Pages Meta lists at once, to test paging. */
  readonly pageSize?: number;
}

const proofOf = (token: string, secret: Redacted.Redacted) =>
  createHmac("sha256", Redacted.value(secret)).update(token).digest("hex");

const graphError = (code: number, status = 400): FakeResponse =>
  json(
    { error: { code, message: "synthetic", type: "OAuthException" } },
    status
  );

const allPermissions = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "public_profile",
];

// A JSON object of the fields given, without those left undefined, as
// Meta leaves out fields an object does not have.
const present = (
  fields: readonly (readonly [string, JsonValue | undefined])[]
): JsonValue =>
  Object.fromEntries(
    fields.flatMap(([key, value]) =>
      value === undefined ? [] : [[key, value] as const]
    )
  );

// A Page as /me/accounts lists it.
const pageOf = (page: FakePage): JsonValue => {
  const linked = page.instagram;

  return present([
    ["access_token", pageToken(page)],
    ["id", page.id],
    ["name", page.name],
    [
      "picture",
      { data: { url: `https://cdn.facebook.example/${page.id}.jpg` } },
    ],
    ["tasks", page.tasks === undefined ? undefined : [...page.tasks]],
    ["username", page.username],
    [
      "instagram_business_account",
      linked === undefined
        ? undefined
        : present([
            ["id", linked.id],
            ["name", linked.name],
            [
              "profile_picture_url",
              `https://cdn.instagram.example/${linked.id}.jpg`,
            ],
            ["username", linked.username],
          ]),
    ],
  ]);
};

/** The member refuses on the authorization page. */
const deny = (authorizationUrl: string) => ({
  error: "access_denied",
  state: new URL(authorizationUrl).searchParams.get("state") ?? "",
});

const isApp = (params: URLSearchParams, app: MetaApp) =>
  params.get("client_id") === app.appId &&
  params.get("client_secret") === Redacted.value(app.appSecret);

/**
 * Meta's sign-in services on one loopback server: Facebook Login's code
 * and token exchanges and the user's Pages, which check every Graph read's
 * `appsecret_proof`; and Threads' own OAuth, its long-lived tokens and
 * their refresh. `approve` plays the member on either authorization page.
 */
export const fakeMeta = Effect.fnUntraced(function* fakeMeta(
  options: FakeMetaOptions = {}
) {
  const codes = new Map<string, string>();
  const facebookTokens = new Set<string>();
  const threadsTokens = new Set<string>();
  const revoked = new Set<string>();
  let issued = 0;
  let pages: readonly FakePage[] = [];
  let declined: readonly string[] = [];
  let userId = facebookUserId;

  const issue = (tokens: Set<string>, prefix: string) => {
    issued += 1;

    const token = `${prefix}-${issued}`;

    tokens.add(token);

    return token;
  };

  // The code's redirect URI, once: a code works one time.
  const redeem = (code: string | null) => {
    const redirect = codes.get(code ?? "");

    codes.delete(code ?? "");

    return redirect;
  };

  // A Graph read: the user's long-lived token, with its proof.
  const userRead =
    (answer: (request: FakeRequest) => FakeResponse) =>
    (request: FakeRequest): FakeResponse => {
      const token = request.query.get("access_token") ?? "";

      if (!facebookTokens.has(token)) {
        return graphError(190);
      }

      return request.query.get("appsecret_proof") ===
        proofOf(token, metaApp.appSecret)
        ? answer(request)
        : graphError(100);
    };

  const accounts = (request: FakeRequest): FakeResponse => {
    const size = options.pageSize ?? 100;
    const from = Number(request.query.get("after") ?? "0");
    const cursors = { after: String(from + size), before: String(from) };

    return json({
      data: pages.slice(from, from + size).map(pageOf),
      paging:
        from + size < pages.length
          ? { cursors, next: "https://graph.facebook.example/next" }
          : { cursors },
    });
  };

  const facebookToken = ({ query }: FakeRequest): FakeResponse => {
    if (!isApp(query, metaApp)) {
      return graphError(101);
    }

    if (query.get("grant_type") === "fb_exchange_token") {
      return facebookTokens.has(query.get("fb_exchange_token") ?? "")
        ? json({
            access_token: issue(facebookTokens, "fb-user-long"),
            expires_in: 5_183_944,
            token_type: "bearer",
          })
        : graphError(190);
    }

    const redirect = redeem(query.get("code"));

    return redirect !== undefined && redirect === query.get("redirect_uri")
      ? json({
          access_token: issue(facebookTokens, "fb-user-short"),
          token_type: "bearer",
        })
      : graphError(100);
  };

  const threadsCode = (request: FakeRequest): FakeResponse => {
    const form = formOf(request);
    const redirect = redeem(form.get("code"));

    if (
      !isApp(form, threadsApp) ||
      redirect === undefined ||
      redirect !== form.get("redirect_uri")
    ) {
      return json(
        {
          code: 100,
          error_message: "Matching code was not found or was already used",
          error_type: "OAuthException",
        },
        400
      );
    }

    return json({
      access_token: issue(threadsTokens, "threads-short"),
      user_id: Number(threadsAccount.id),
    });
  };

  const longLived = (prefix: string) =>
    json({
      access_token: issue(threadsTokens, prefix),
      expires_in: 5_183_944,
      token_type: "bearer",
    });

  const threadsExchange = ({ query }: FakeRequest): FakeResponse =>
    query.get("grant_type") === "th_exchange_token" &&
    query.get("client_secret") === Redacted.value(threadsApp.appSecret) &&
    threadsTokens.has(query.get("access_token") ?? "")
      ? longLived("threads-long")
      : graphError(190);

  const threadsRefresh = ({ query }: FakeRequest): FakeResponse => {
    const old = query.get("access_token") ?? "";

    return query.get("grant_type") === "th_refresh_token" &&
      threadsTokens.has(old) &&
      !revoked.has(old)
      ? longLived("threads-refreshed")
      : graphError(190);
  };

  const routes = new Map<string, (request: FakeRequest) => FakeResponse>([
    ["GET /access_token", threadsExchange],
    ["GET /refresh_access_token", threadsRefresh],
    [
      "GET /v1.0/me",
      ({ query }) =>
        threadsTokens.has(query.get("access_token") ?? "")
          ? json(threadsAccount)
          : graphError(190),
    ],
    ["GET /v27.0/me", userRead(() => json({ id: userId }))],
    ["GET /v27.0/me/accounts", userRead(accounts)],
    [
      "GET /v27.0/me/permissions",
      userRead(() =>
        json({
          data: allPermissions.map((permission) => ({
            permission,
            status: declined.includes(permission) ? "declined" : "granted",
          })),
        })
      ),
    ],
    ["GET /v27.0/oauth/access_token", facebookToken],
    ["POST /oauth/access_token", threadsCode],
  ]);

  const handle = (request: FakeRequest): FakeResponse =>
    routes.get(`${request.method} ${request.path}`)?.(request) ??
    json({ error: { code: 803, message: "Unknown path" } }, 404);

  const server = yield* fakeHttpServer(handle);

  const hosts: MetaHosts = {
    facebookDialog: new URL(server.url),
    facebookGraph: new URL(server.url),
    threadsAuthorize: new URL(server.url),
    threadsGraph: new URL(server.url),
  };

  /** The member approves on the authorization page: back with a code. */
  const approve = (authorizationUrl: string) => {
    const url = new URL(authorizationUrl);
    const state = url.searchParams.get("state") ?? "";
    const code = `code-${codes.size + 1}-${state.slice(0, 6)}`;

    codes.set(code, url.searchParams.get("redirect_uri") ?? "");

    return { code, state };
  };

  return {
    ...server,
    approve,
    deny,
    hosts,
    /** Meta stops taking the token, as when the user removes the app. */
    revoke: (token: string) => {
      revoked.add(token);
    },
    /** The permissions the user declines from now on. */
    setDeclined: (next: readonly string[]) => {
      declined = next;
    },
    /** The Pages the user manages from now on. */
    setPages: (next: readonly FakePage[]) => {
      pages = next;
    },
    /** The Facebook user who signs in from now on. */
    setUser: (next: string) => {
      userId = next;
    },
  };
});

/**
 * A request signed as Meta signs data deletion requests: the payload in
 * base64url, after its HMAC-SHA256 keyed with the app secret.
 */
export const signedRequest = (
  payload: Readonly<Record<string, number | string>>,
  secret: Redacted.Redacted
): string => {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");

  const signature = createHmac("sha256", Redacted.value(secret))
    .update(encoded)
    .digest("base64url");

  return `${signature}.${encoded}`;
};
