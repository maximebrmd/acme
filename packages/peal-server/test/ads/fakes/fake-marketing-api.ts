import { createHmac } from "node:crypto";

import { Effect, Redacted, Schema } from "effect";

import type { MetaApp } from "#shared/infrastructure/platforms/meta-apps.ts";
import { metaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";
import type { MetaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";
import {
  dropped,
  json,
  platformServer,
  textOf,
} from "#test/publishing/fakes/platform-server.ts";
import type {
  JsonValue,
  PlatformAnswer,
  PlatformRequest,
} from "#test/publishing/fakes/platform-server.ts";

// A stand-in for Meta's Marketing API on loopback, written from its
// reference: the sign-in's token exchange, the ad accounts a person
// reaches, campaigns, ad sets, ads and insights, the creation of each
// (paused or not, as asked), and the status update that runs or pauses
// them. It checks the app secret proof and the token on every call, keeps
// what was created, and can be told to refuse, to slow down, or to lose an
// answer.

/** The app the ads sign-in runs with, for tests only. */
export const adsApp: MetaApp = {
  appId: "1234567890",
  appSecret: Redacted.make("synthetic-meta-secret"),
};

/** The Facebook user who signs in, as Meta scopes their id to the app. */
export const adsUserId = "10220000000000042";

export const adsToken = "synthetic-ads-user-token";

/** A synthetic ad account, as the "Ad Account" reference describes one. */
export interface FakeAdAccount {
  readonly account_id: string;
  account_status: number;
  amount_spent: string;
  readonly currency: string;
  readonly name: string;
  spend_cap: string;
  readonly timezone_name: string;
}

export const euroAccount = (): FakeAdAccount => ({
  account_id: "1001",
  account_status: 1,
  amount_spent: "0",
  currency: "EUR",
  name: "Example Studio",
  spend_cap: "0",
  timezone_name: "Europe/Paris",
});

export const yenAccount = (): FakeAdAccount => ({
  account_id: "1002",
  account_status: 1,
  amount_spent: "120000",
  currency: "JPY",
  name: "Example Studio Japan",
  spend_cap: "500000",
  timezone_name: "Asia/Tokyo",
});

/** An object the fake holds: a campaign, an ad set or an ad. */
export interface FakeObject {
  readonly accountId: string;
  readonly id: string;
  readonly kind: "ad" | "adset" | "campaign";
  readonly params: Readonly<Record<string, string>>;
  status: string;
}

/** A day of an ad's numbers, as the Insights API writes one. */
export interface FakeInsight {
  readonly actions?: readonly { action_type: string; value: string }[];
  readonly ad_id: string;
  readonly clicks?: string;
  readonly date_start: string;
  readonly impressions?: string;
  readonly reach?: string;
  readonly spend?: string;
}

/**
 * What to do with the next request that matches, once:
 *
 * - an answer: sent instead of handling the request;
 * - `lost`: the request is handled, and the connection cut before the
 *   answer, as a network that fails after the server acted;
 * - `dropped`: the connection is cut before the request is handled.
 */
export interface Scripted {
  readonly answer: PlatformAnswer | "dropped" | "lost";
  readonly when: (request: PlatformRequest) => boolean;
}

export interface FakeMarketingOptions {
  readonly accounts?: readonly FakeAdAccount[];
  /** The Instagram account linked to each Page the user manages. */
  readonly pages?: readonly { id: string; instagram?: string }[];
  /** What the user allowed; every ads permission unless told. */
  readonly permissions?: readonly string[];
  /** How many items a listing gives at once. */
  readonly pageSize?: number;
  /** The seconds the long-lived token lasts; none when left out. */
  readonly expiresIn?: number;
  /** Usage headers sent with every answer. */
  readonly usage?: Readonly<Record<string, string>>;
}

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

/** A Graph error, as `{ error: { code, error_subcode } }`. */
export const marketingError = (
  code: number,
  subcode?: number,
  status = 400,
  headers: Readonly<Record<string, string>> = {}
): PlatformAnswer =>
  json(
    {
      error: present([
        ["code", code],
        ["error_subcode", subcode],
        ["message", "synthetic"],
        ["type", "OAuthException"],
      ]),
    },
    status,
    headers
  );

/** The ad account's usage header, at a percentage. */
export const adAccountUsage = (percent: number, resetSeconds = 120) => ({
  "x-ad-account-usage": JSON.stringify({
    acc_id_util_pct: percent,
    ads_api_access_tier: "development_access",
    reset_time_duration: resetSeconds,
  }),
});

/** The business use case header, saying how long access is withheld. */
export const adsBusinessUsage = (accountId: string, minutes: number) => ({
  "x-business-use-case-usage": JSON.stringify({
    [accountId]: [
      {
        call_count: 100,
        estimated_time_to_regain_access: minutes,
        total_cputime: 10,
        total_time: 10,
        type: "ads_management",
      },
    ],
  }),
});

const allPermissions = [
  "ads_read",
  "ads_management",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_ads",
  "public_profile",
];

const proofOf = (token: string) =>
  createHmac("sha256", Redacted.value(adsApp.appSecret))
    .update(token)
    .digest("hex");

const formOf = (request: PlatformRequest) =>
  new URLSearchParams(textOf(request));

const version = "/v27.0";

const decodeCreative = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Record(Schema.String, Schema.String))
);

const decodeStatuses = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Array(Schema.String))
);

const decodeRange = Schema.decodeUnknownSync(
  Schema.fromJsonString(
    Schema.Struct({
      since: Schema.optionalKey(Schema.String),
      until: Schema.optionalKey(Schema.String),
    })
  )
);

const kinds = { ads: "ad", adsets: "adset", campaigns: "campaign" } as const;

const isEdge = (edge: string): edge is keyof typeof kinds => edge in kinds;

// What the creative of an ad says it shows.
const creativeJson = (object: FakeObject): JsonValue => {
  const creative = decodeCreative(object.params["creative"] ?? "{}");

  return present([
    ["effective_object_story_id", creative["object_story_id"]],
    ["effective_instagram_media_id", creative["source_instagram_media_id"]],
  ]);
};

// Why the fake refuses to make an object, if it does.
const creationRefusal = (
  kind: FakeObject["kind"],
  params: Readonly<Record<string, string>>
): PlatformAnswer | undefined => {
  // "All campaign creations require the special_ad_categories field."
  if (kind === "campaign" && params["special_ad_categories"] === undefined) {
    return marketingError(100, 1_885_029);
  }

  if (kind !== "adset") {
    return undefined;
  }

  const budget = Number(
    params["lifetime_budget"] ?? params["daily_budget"] ?? "0"
  );

  // "Budget is too low."
  if (budget < 100) {
    return marketingError(100, 1_885_272);
  }

  // A lifetime budget needs an end time.
  return params["lifetime_budget"] !== undefined &&
    params["end_time"] === undefined
    ? marketingError(100, 1_487_534)
    : undefined;
};

export const fakeMarketingApi = (options: FakeMarketingOptions = {}) =>
  Effect.gen(function* startFake() {
    const accounts = new Map(
      (options.accounts ?? [euroAccount()]).map((account) => [
        account.account_id,
        account,
      ])
    );

    const objects = new Map<string, FakeObject>();
    const insights: FakeInsight[] = [];
    const scripts: Scripted[] = [];
    const pageSize = options.pageSize ?? 100;
    let acceptedToken = adsToken;
    let nextId = 5000;
    let usage = options.usage ?? {};

    const withUsage = (answer: PlatformAnswer): PlatformAnswer =>
      answer._tag === "answer"
        ? { ...answer, headers: { ...usage, ...answer.headers } }
        : answer;

    const page = (request: PlatformRequest, items: readonly JsonValue[]) => {
      const start = Number(request.query.get("after") ?? "0");

      const end =
        start + Math.min(Number(request.query.get("limit") ?? "25"), pageSize);

      return json({
        data: items.slice(start, end),
        paging: present([
          ["cursors", { after: String(end) }],
          [
            "next",
            end < items.length
              ? `https://graph.facebook.example/next?after=${end}`
              : undefined,
          ],
        ]),
      });
    };

    // An object under a paused ad set or campaign is paused by it.
    const effectiveStatus = (object: FakeObject): string => {
      if (object.status !== "ACTIVE" || object.kind === "campaign") {
        return object.status;
      }

      const parent = objects.get(
        object.kind === "ad"
          ? (object.params["adset_id"] ?? "")
          : (object.params["campaign_id"] ?? "")
      );

      const above = parent === undefined ? "ACTIVE" : effectiveStatus(parent);

      if (above === "ACTIVE") {
        return "ACTIVE";
      }

      return parent?.kind === "campaign" || above === "CAMPAIGN_PAUSED"
        ? "CAMPAIGN_PAUSED"
        : "ADSET_PAUSED";
    };

    const objectJson = (object: FakeObject): JsonValue => {
      const { params } = object;
      const adSet = objects.get(params["adset_id"] ?? "");

      return present([
        ["id", object.id],
        ["name", params["name"] ?? ""],
        ["status", object.status],
        ["effective_status", effectiveStatus(object)],
        [
          "objective",
          object.kind === "campaign"
            ? (params["objective"] ?? "OUTCOME_ENGAGEMENT")
            : undefined,
        ],
        [
          "campaign_id",
          object.kind === "ad"
            ? (adSet?.params["campaign_id"] ?? "")
            : params["campaign_id"],
        ],
        ["daily_budget", params["daily_budget"]],
        ["lifetime_budget", params["lifetime_budget"]],
        ["start_time", params["start_time"]],
        ["end_time", params["end_time"]],
        ["adset_id", params["adset_id"]],
        ["creative", object.kind === "ad" ? creativeJson(object) : undefined],
      ]);
    };

    const authorized = (request: PlatformRequest) => {
      const params = request.method === "GET" ? request.query : formOf(request);
      const token = params.get("access_token") ?? "";

      if (token !== acceptedToken) {
        return marketingError(190, 463, 401);
      }

      return params.get("appsecret_proof") === proofOf(token)
        ? undefined
        : marketingError(100);
    };

    const hold = (
      kind: FakeObject["kind"],
      accountId: string,
      params: Readonly<Record<string, string>>,
      status = "ACTIVE"
    ) => {
      nextId += 1;

      const held: FakeObject = {
        accountId,
        id: String(nextId),
        kind,
        params,
        status,
      };

      objects.set(held.id, held);

      return held;
    };

    const created = (
      request: PlatformRequest,
      accountId: string,
      kind: FakeObject["kind"]
    ): PlatformAnswer => {
      const params = Object.fromEntries(formOf(request));

      return (
        creationRefusal(kind, params) ??
        json({
          id: hold(kind, accountId, params, params["status"] ?? "ACTIVE").id,
        })
      );
    };

    const listing = (
      request: PlatformRequest,
      kind: FakeObject["kind"],
      within: (object: FakeObject) => boolean
    ) => {
      const statuses = request.query.get("effective_status");
      const wanted = statuses === null ? undefined : decodeStatuses(statuses);

      return page(
        request,
        [...objects.values()].flatMap((object) =>
          object.kind === kind &&
          within(object) &&
          (wanted === undefined || wanted.includes(effectiveStatus(object)))
            ? [objectJson(object)]
            : []
        )
      );
    };

    const exchange = (request: PlatformRequest): PlatformAnswer => {
      const { query } = request;

      if (query.get("client_secret") !== Redacted.value(adsApp.appSecret)) {
        return marketingError(101);
      }

      if (query.get("grant_type") === "fb_exchange_token") {
        return query.get("fb_exchange_token") === "short-lived"
          ? json(
              present([
                ["access_token", acceptedToken],
                ["token_type", "bearer"],
                ["expires_in", options.expiresIn],
              ])
            )
          : marketingError(190);
      }

      return query.get("code") === "good-code"
        ? json({ access_token: "short-lived", token_type: "bearer" })
        : marketingError(100, 36_007);
    };

    const ofUser = (request: PlatformRequest): PlatformAnswer | undefined => {
      const granted = options.permissions ?? allPermissions;

      switch (request.path) {
        case `${version}/me`: {
          return json({ id: adsUserId });
        }

        case `${version}/me/permissions`: {
          return json({
            data: allPermissions.map((permission) => ({
              permission,
              status: granted.includes(permission) ? "granted" : "declined",
            })),
          });
        }

        case `${version}/me/adaccounts`: {
          return page(
            request,
            [...accounts.values()].map((account) => ({
              ...account,
              id: `act_${account.account_id}`,
            }))
          );
        }

        case `${version}/me/accounts`: {
          return page(
            request,
            (options.pages ?? []).map((managed) =>
              present([
                ["id", managed.id],
                [
                  "instagram_business_account",
                  managed.instagram === undefined
                    ? undefined
                    : { id: managed.instagram },
                ],
              ])
            )
          );
        }

        default: {
          return undefined;
        }
      }
    };

    const insightsOf = (request: PlatformRequest, accountId: string) => {
      const range = decodeRange(request.query.get("time_range") ?? "{}");

      return page(
        request,
        insights.flatMap((row) =>
          objects.get(row.ad_id)?.accountId === accountId &&
          row.date_start >= (range.since ?? "") &&
          row.date_start <= (range.until ?? "9999")
            ? [
                {
                  ...row,
                  actions: [...(row.actions ?? [])],
                  date_stop: row.date_start,
                },
              ]
            : []
        )
      );
    };

    const ofAccount = (
      request: PlatformRequest,
      accountId: string,
      edge: string | undefined
    ): PlatformAnswer => {
      const account = accounts.get(accountId);

      if (account === undefined) {
        return marketingError(100, 33);
      }

      if (edge === undefined) {
        return json({ ...account, id: `act_${accountId}` });
      }

      if (edge === "insights") {
        return insightsOf(request, accountId);
      }

      if (!isEdge(edge)) {
        return marketingError(803, undefined, 404);
      }

      return request.method === "POST"
        ? created(request, accountId, kinds[edge])
        : listing(
            request,
            kinds[edge],
            (object) => object.accountId === accountId
          );
    };

    const ofObject = (
      request: PlatformRequest,
      object: FakeObject,
      edge: string | undefined
    ): PlatformAnswer => {
      if (edge === "adsets") {
        return listing(
          request,
          "adset",
          (child) => child.params["campaign_id"] === object.id
        );
      }

      if (edge === "ads") {
        return listing(
          request,
          "ad",
          (child) => child.params["adset_id"] === object.id
        );
      }

      if (request.method !== "POST") {
        return json(objectJson(object));
      }

      const status = formOf(request).get("status");

      if (status !== "ACTIVE" && status !== "PAUSED") {
        return marketingError(100);
      }

      object.status = status;

      return json({ success: true });
    };

    const handled = (request: PlatformRequest): PlatformAnswer => {
      const { path } = request;

      if (path === `${version}/oauth/access_token`) {
        return exchange(request);
      }

      const refused = authorized(request) ?? ofUser(request);

      if (refused !== undefined) {
        return refused;
      }

      const onAccount =
        /^\/v27\.0\/act_(?<account>\d+)(?:\/(?<edge>\w+))?$/u.exec(
          path
        )?.groups;

      if (onAccount !== undefined) {
        return ofAccount(
          request,
          onAccount["account"] ?? "",
          onAccount["edge"]
        );
      }

      const onObject = /^\/v27\.0\/(?<id>\d+)(?:\/(?<edge>\w+))?$/u.exec(
        path
      )?.groups;

      const object = objects.get(onObject?.["id"] ?? "");

      return object === undefined
        ? marketingError(803, undefined, 404)
        : ofObject(request, object, onObject?.["edge"]);
    };

    const server = yield* platformServer((request) => {
      const index = scripts.findIndex(({ when }) => when(request));
      const [script] = index === -1 ? [] : scripts.splice(index, 1);

      if (script === undefined) {
        return withUsage(handled(request));
      }

      if (script.answer === "dropped") {
        return dropped;
      }

      if (script.answer === "lost") {
        handled(request);

        return dropped;
      }

      return withUsage(script.answer);
    });

    const origin = new URL(server.url);

    const hosts: MetaHosts = {
      ...metaHosts,
      facebookDialog: origin,
      facebookGraph: origin,
    };

    return {
      /** The account as the fake holds it, to change what it says. */
      account: (id: string) => {
        const account = accounts.get(id);

        if (account === undefined) {
          throw new Error(`The fake holds no ad account ${id}`);
        }

        return account;
      },
      /** Adds days of numbers for ads the fake holds. */
      addInsights: (rows: readonly FakeInsight[]) => {
        insights.push(...rows);
      },
      /** Changes the token the fake accepts: the old one is refused. */
      expectToken: (token: string) => {
        acceptedToken = token;
      },
      /** Puts an object in the fake, as one made outside Peal. */
      hold,
      hosts,
      /** What the fake holds, in the order it was made. */
      objects: (kind?: FakeObject["kind"]) =>
        [...objects.values()].filter(
          (object) => kind === undefined || object.kind === kind
        ),
      requests: server.requests,
      /** Scripts the next request that matches, once. */
      script: (scripted: Scripted) => {
        scripts.push(scripted);
      },
      /** The usage headers every later answer carries. */
      setUsage: (headers: Readonly<Record<string, string>>) => {
        usage = headers;
      },
      url: server.url,
      /** The requests that change something, in order. */
      writes: () =>
        server.requests().flatMap((request) =>
          request.method === "POST"
            ? [
                {
                  params: Object.fromEntries(formOf(request)),
                  path: request.path.slice(version.length),
                },
              ]
            : []
        ),
    };
  });

/** A request to create an object of a kind, for `script`. */
export const creating =
  (edge: "ads" | "adsets" | "campaigns") => (request: PlatformRequest) =>
    request.method === "POST" && request.path.endsWith(`/${edge}`);

/** A request to run or pause an object, for `script`. */
export const settingStatus =
  (id: string, status?: "ACTIVE" | "PAUSED") => (request: PlatformRequest) =>
    request.method === "POST" &&
    request.path === `${version}/${id}` &&
    (status === undefined ||
      new URLSearchParams(textOf(request)).get("status") === status);
