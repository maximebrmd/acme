import { createHash } from "node:crypto";

import { Effect } from "effect";

import type { GoogleBusinessEndpoints } from "#channels/infrastructure/platforms/google-business/google-business-authorizer.ts";
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

/** A synthetic location with Voice of Merchant, as locations.list shows it. */
export const businessLocation = {
  metadata: { hasVoiceOfMerchant: true, placeId: "ChIJsynthetic000001" },
  name: "locations/100000000000000001",
  storeCode: "PEAL-001",
  storefrontAddress: {
    addressLines: ["1 Synthetic Street"],
    locality: "Exampleville",
    regionCode: "FR",
  },
  title: "Peal Example Bakery",
} as const;

/** A second one, without an address: a business that serves an area. */
export const otherBusinessLocation = {
  metadata: { hasVoiceOfMerchant: true },
  name: "locations/100000000000000002",
  storeCode: "PEAL-002",
  title: "Peal Example Bakery",
} as const;

/** A location Google has not verified: it cannot post. */
export const unverifiedBusinessLocation = {
  metadata: { hasVoiceOfMerchant: false },
  name: "locations/100000000000000003",
  title: "Peal Example Kiosk",
} as const;

/** An account of the Business Profile APIs, with its locations. */
export interface FakeBusinessAccount {
  readonly locations: readonly JsonValue[];
  readonly name: string;
}

/** The synthetic Google user's own account, holding one location. */
export const businessAccount: FakeBusinessAccount = {
  locations: [businessLocation],
  name: "accounts/200000000000000001",
};

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

// One page of `items` under `key`, as Google pages its lists: `pageSize`
// items, and a token for the next page while there is one.
const paged = (
  request: FakeRequest,
  key: string,
  items: readonly JsonValue[],
  defaultSize: number
): FakeResponse => {
  const from = Number(request.query.get("pageToken") ?? "0");
  const size = Number(request.query.get("pageSize") ?? defaultSize);
  const next = from + size;

  const listed = items.slice(from, next);

  return json(
    next < items.length
      ? { [key]: listed, nextPageToken: String(next) }
      : { [key]: listed }
  );
};

/**
 * Google's OAuth 2.0, the YouTube Data API's channels.list for synthetic
 * channels, and the Business Profile APIs' accounts.list and
 * accounts.locations.list for synthetic locations: it issues codes for the consent page (`approve` plays the
 * owner, granting every scope asked or some), exchanges them with PKCE and
 * the client's secret in the form, refreshes with refresh tokens that keep
 * working, revokes tokens, and lists the channels the token signs in as
 * (`channels`, the synthetic one by default). `failNext` makes the next
 * answers to a route failures.
 */
export const fakeGoogle = Effect.fnUntraced(function* fakeGoogle() {
  const codes = new Map<string, PendingCode>();
  const accessTokens = new Set<string>();
  // Each refresh token, with the scope its grant holds.
  const refreshTokens = new Map<string, string>();
  const revoked: string[] = [];
  const failures = new Map<string, FakeResponse[]>();
  let channels: readonly JsonValue[] = [youtubeChannel];
  let businessAccounts: readonly FakeBusinessAccount[] = [businessAccount];
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
      const granted = refreshTokens.get(form.get("refresh_token") ?? "");

      return granted === undefined ? invalidGrant : json(access(granted));
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

    refreshTokens.set(refresh, code.scope);

    return json({ ...access(code.scope), refresh_token: refresh });
  };

  // The Account Management API's accounts.list and the Business
  // Information API's accounts.locations.list, which refuses a request
  // without a read mask.
  const business = (request: FakeRequest): FakeResponse => {
    if (!accessTokens.has(bearerOf(request))) {
      return json(
        {
          error: {
            code: 401,
            message: "Invalid Credentials",
            status: "UNAUTHENTICATED",
          },
        },
        401
      );
    }

    if (request.path === "/v1/accounts") {
      return paged(
        request,
        "accounts",
        businessAccounts.map(({ name }) => ({
          accountName: "Synthetic Owner",
          name,
          type: "PERSONAL",
        })),
        20
      );
    }

    const account = businessAccounts.find(
      ({ name }) => request.path === `/v1/${name}/locations`
    );

    if (account === undefined) {
      return json({ error: { code: 404, message: "Not Found" } }, 404);
    }

    if ((request.query.get("readMask") ?? "") === "") {
      return json(
        {
          error: {
            code: 400,
            message: "read_mask is required",
            status: "INVALID_ARGUMENT",
          },
        },
        400
      );
    }

    return paged(request, "locations", account.locations, 10);
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

    if (request.method === "GET" && request.path.startsWith("/v1/accounts")) {
      return business(request);
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

  const businessEndpoints: GoogleBusinessEndpoints = {
    accountManagement: new URL(server.url),
    authorization: endpoints.authorization,
    businessInformation: new URL(server.url),
    revocation: endpoints.revocation,
    token: endpoints.token,
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
    /** Where the Business Profile authorizer finds this fake. */
    businessEndpoints,
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
    /** The Business Profile accounts the next sign-ins reach. */
    setBusinessAccounts: (next: readonly FakeBusinessAccount[]) => {
      businessAccounts = next;
    },
    /** The channels the next sign-ins reach. */
    setChannels: (next: readonly JsonValue[]) => {
      channels = next;
    },
  };
});
