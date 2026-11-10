import { DateTime, Duration, Effect, Option, Redacted, Schema } from "effect";
import { Mac } from "effect/crypto";

import { AdNetworkRefused } from "#ads/application/ad-network-refused.ts";
import { AdSignInFailed } from "#ads/application/ad-sign-in-failed.ts";
import type {
  AdNetworkClient,
  LookUp,
  NewObject,
  ReadFailure,
} from "#ads/application/ports/ad-network.ts";
import type { AdsMode } from "#ads/domain/ads-mode.ts";
import { NetworkObjectIdSchema } from "#ads/domain/ids.ts";
import type { NetworkObjectId } from "#ads/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";
import { addDays } from "#shared/domain/wall-clock.ts";
import type { MetaApp } from "#shared/infrastructure/platforms/meta-apps.ts";
import {
  appSecretProof,
  graphApiVersion,
  graphUrl,
} from "#shared/infrastructure/platforms/meta-graph.ts";
import type { MetaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";

import { getWith, postForm, read, write } from "./marketing-http.ts";
import type { MarketingHttp, MarketingUsage } from "./marketing-http.ts";
import {
  adOf,
  adSetOf,
  campaignOf,
  factsOf,
  insightOf,
} from "./marketing-mapping.ts";
import {
  accountFields,
  AccountSchema,
  adFields,
  AdSchema,
  adSetFields,
  AdSetSchema,
  campaignFields,
  CampaignSchema,
  CreatedSchema,
  insightFields,
  InsightSchema,
  listOf,
  NamedSchema,
  PageSchema,
  PermissionsSchema,
  StatusSchema,
  TokenSchema,
  UpdatedSchema,
  UserSchema,
} from "./marketing-schemas.ts";

/** Where Meta sends a member back after the ads sign-in. */
export const metaAdsCallbackPath = "/connect/ads/meta/callback";

// From Meta's "Authorization" page of the Marketing API: `ads_read` reads
// ad accounts and their reports, `ads_management` makes and changes ads.
// An ad that shows a Page's post also needs its person's access to the
// Page.
const readScope = "ads_read";

const spendScopes = [
  "ads_management",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_ads",
] as const;

/**
 * The share of an ad account's rate limit past which a sync stops reading
 * it and leaves the rest for later: a boost's requests need the room, and
 * an account that reaches its limit is refused everything for a while.
 */
export const haltAtPercent = 75;

// Used when the network asked to slow down without saying for how long.
const defaultHalt = Duration.minutes(15);

// Listings are read a page at a time, up to these bounds: an account holds
// 6,000 campaigns, ad sets and ads at most ("Ad Account" reference).
const pageSize = 200;
const maxPages = 40;
const insightPageSize = 500;
const maxInsightPages = 200;

// A lookup of a campaign by name reads the account's paused campaigns,
// this many pages at most; past them it cannot tell.
const maxLookUpPages = 30;

const dayText = ({ day, month, year }: LocalDate) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

// Budgets go out in the account's minor units, as whole numbers. Instants
// go out in ISO 8601, in UTC.
const iso = (instant: DateTime.Utc) => DateTime.formatIso(instant);

/** What a listing read: its items, and whether it was read whole. */
interface Listing<A> {
  readonly complete: boolean;
  readonly halted: Option.Option<Duration.Duration>;
  readonly items: readonly A[];
}

const decodeObjectId = Schema.decodeUnknownOption(NetworkObjectIdSchema);

const absent: LookUp<never> = { _tag: "absent" };
const unknown: LookUp<never> = { _tag: "unknown" };

// A sign-in's steps fail alike: the network busy is for later, and any
// refusal is the sign-in failing.
const signingIn = <A>(
  step: Effect.Effect<A, ReadFailure>
): Effect.Effect<A, AdSignInFailed | PlatformUnavailable> =>
  step.pipe(
    Effect.catchTags({
      AdNetworkRefused: ({ code }) =>
        Effect.logWarning("Meta refused a step of the ads sign-in").pipe(
          Effect.annotateLogs({ code }),
          Effect.andThen(Effect.fail(new AdSignInFailed({ reason: "failed" })))
        ),
      RateLimited: () => Effect.fail(new PlatformUnavailable()),
      TokenRejected: () =>
        Effect.fail(new AdSignInFailed({ reason: "failed" })),
    })
  );

const haltOf = (usage: MarketingUsage) =>
  usage.percent >= haltAtPercent
    ? Option.some(Option.getOrElse(usage.wait, () => defaultHalt))
    : Option.none<Duration.Duration>();

// A listing made only when none before it was cut short: the wait the
// network gave is passed on, and nothing more is asked.
const unlessHalted = <A>(
  earlier: { readonly halted: Option.Option<Duration.Duration> },
  listing: Effect.Effect<Listing<A>, ReadFailure>
): Effect.Effect<Listing<A>, ReadFailure> =>
  Option.isSome(earlier.halted)
    ? Effect.succeed({ complete: false, halted: earlier.halted, items: [] })
    : listing;

// The object of a listing that carries the name, if the listing was
// read whole.
const named = (
  listing: Effect.Effect<
    {
      readonly complete: boolean;
      readonly items: readonly (typeof NamedSchema.Type)[];
    },
    ReadFailure
  >,
  name: string
): Effect.Effect<LookUp<NetworkObjectId>> =>
  listing.pipe(
    Effect.map(({ complete, items }): LookUp<NetworkObjectId> => {
      const found = items.find((item) => item.name === name);

      if (found !== undefined) {
        return {
          _tag: "found",
          value: NetworkObjectIdSchema.make(found.id),
        };
      }

      return complete ? absent : unknown;
    }),
    Effect.catch(() => Effect.succeed<LookUp<NetworkObjectId>>(unknown)),
    Effect.catchDefect(() => Effect.succeed<LookUp<NetworkObjectId>>(unknown))
  );

/**
 * Meta's Marketing API, for ads on Facebook and Instagram: the sign-in
 * (Facebook Login, with the ads permissions), the reads a sync makes, and
 * the requests a boost is made of. Every Graph call carries the
 * `appsecret_proof` Meta asks for when the app requires it; requests that
 * change something send the token in their body, never in their address.
 *
 * A boost is a campaign with the engagement objective, one ad set holding
 * its budget, its run and its audience, and one ad that shows the post as
 * it is, each made paused. Nothing is validated by a trial request, which
 * Meta counts as a write.
 */
export const metaAdsClient = Effect.fn("MetaAds.client")(
  function* metaAdsClient(options: {
    readonly app: MetaApp;
    readonly hosts: MetaHosts;
    readonly http: MarketingHttp;
    readonly mode: AdsMode;
    readonly publicUrl: string;
  }) {
    const mac = yield* Mac.Mac;
    const { app, hosts, http } = options;

    const redirectUri = new URL(metaAdsCallbackPath, options.publicUrl).href;

    const proofOf = (token: Redacted.Redacted) =>
      appSecretProof(token, app.appSecret).pipe(
        Effect.provideService(Mac.Mac, mac)
      );

    const get = <A, I>(
      path: string,
      token: Redacted.Redacted,
      params: Readonly<Record<string, string>>,
      schema: Schema.Codec<A, I>
    ) =>
      proofOf(token).pipe(
        Effect.flatMap((proof) =>
          read(
            http,
            getWith(graphUrl(hosts, path), {
              ...params,
              access_token: token,
              appsecret_proof: proof,
            }),
            schema
          )
        )
      );

    const post = <A, I>(
      path: string,
      token: Redacted.Redacted,
      params: Readonly<Record<string, string>>,
      schema: Schema.Codec<A, I>
    ) =>
      proofOf(token).pipe(
        Effect.flatMap((proof) =>
          write(
            http,
            postForm(graphUrl(hosts, path), {
              ...params,
              access_token: token,
              appsecret_proof: proof,
            }),
            schema
          )
        )
      );

    const tokenFor = (
      params: Readonly<Record<string, Redacted.Redacted | string>>
    ) =>
      read(
        http,
        getWith(graphUrl(hosts, "/oauth/access_token"), {
          ...params,
          client_id: app.appId,
          client_secret: app.appSecret,
        }),
        TokenSchema
      ).pipe(Effect.map(({ value }) => value));

    /**
     * Every item of a listing, a page at a time, until the last page, the
     * bound, or the account nearing its rate limit, which `halted` then
     * reports with the wait the network gave.
     */
    const listed = Effect.fn("MetaAds.listed")(function* listed<A, I>(
      path: string,
      token: Redacted.Redacted,
      params: Readonly<Record<string, string>>,
      item: Schema.Codec<A, I>,
      bound: number
    ) {
      const items: A[] = [];
      let after = Option.none<string>();
      let halted = Option.none<Duration.Duration>();
      let complete = false;

      for (let page = 0; page < bound; page += 1) {
        const { usage, value } = yield* get(
          path,
          token,
          {
            ...params,
            ...Option.match(after, {
              onNone: () => ({}),
              onSome: (cursor) => ({ after: cursor }),
            }),
          },
          listOf(item)
        );

        items.push(...value.data);
        after = Option.fromUndefinedOr(value.paging?.cursors?.after);

        if (value.paging?.next === undefined || Option.isNone(after)) {
          complete = true;
          break;
        }

        if (usage.percent >= haltAtPercent) {
          halted = Option.some(Option.getOrElse(usage.wait, () => defaultHalt));
          break;
        }
      }

      const listing: Listing<A> = { complete, halted, items };

      return listing;
    });

    const accounts: AdNetworkClient["accounts"] = (token) =>
      listed(
        "/me/adaccounts",
        token,
        { fields: accountFields, limit: String(pageSize) },
        AccountSchema,
        maxPages
      ).pipe(
        Effect.map(({ items }) =>
          items.flatMap((account) => Option.toArray(factsOf(account)))
        )
      );

    const account: AdNetworkClient["account"] = (token, externalId) =>
      get(
        `/act_${externalId}`,
        token,
        { fields: accountFields },
        AccountSchema
      ).pipe(
        Effect.flatMap(({ value }) =>
          Option.match(factsOf(value), {
            onNone: () =>
              Effect.fail(
                new AdNetworkRefused({ code: "unreadable", kind: "other" })
              ),
            onSome: (facts) => Effect.succeed(facts),
          })
        )
      );

    const snapshot: AdNetworkClient["snapshot"] = Effect.fn("MetaAds.snapshot")(
      function* snapshot(token, request) {
        const path = `/act_${request.externalId}`;
        const { currency } = request;
        const limit = { limit: String(pageSize) };

        const facts = yield* get(
          path,
          token,
          { fields: accountFields },
          AccountSchema
        );

        const campaigns = yield* unlessHalted(
          { halted: haltOf(facts.usage) },
          listed(
            `${path}/campaigns`,
            token,
            { ...limit, fields: campaignFields },
            CampaignSchema,
            maxPages
          )
        );

        const adSets = yield* unlessHalted(
          campaigns,
          listed(
            `${path}/adsets`,
            token,
            { ...limit, fields: adSetFields },
            AdSetSchema,
            maxPages
          )
        );

        const ads = yield* unlessHalted(
          adSets,
          listed(
            `${path}/ads`,
            token,
            { ...limit, fields: adFields },
            AdSchema,
            maxPages
          )
        );

        const insights = yield* unlessHalted(
          ads,
          listed(
            `${path}/insights`,
            token,
            {
              fields: insightFields,
              level: "ad",
              limit: String(insightPageSize),
              time_increment: "1",
              // The day after the last one asked: whichever way the
              // network reads `until`, the last day is covered, and a day
              // read twice is kept once.
              time_range: JSON.stringify({
                since: dayText(request.since),
                until: dayText(addDays(request.until, 1)),
              }),
            },
            InsightSchema,
            maxInsightPages
          )
        );

        return {
          adSets: adSets.items.flatMap((adSet) =>
            Option.toArray(adSetOf(adSet, currency))
          ),
          ads: ads.items.flatMap((ad) => Option.toArray(adOf(ad))),
          campaigns: campaigns.items.flatMap((campaign) =>
            Option.toArray(campaignOf(campaign, currency))
          ),
          complete: campaigns.complete && adSets.complete && ads.complete,
          facts: factsOf(facts.value),
          haltedFor: insights.halted,
          insights: insights.items.flatMap((row) =>
            Option.toArray(insightOf(row, currency))
          ),
        };
      }
    );

    // The Page an ad of an Instagram media runs as: the one the Instagram
    // account is linked to, among those the grant's person manages.
    const pageOf = Effect.fn("MetaAds.pageOf")(function* pageOf(
      token: Redacted.Redacted,
      instagramAccountId: string
    ) {
      const pages = yield* listed(
        "/me/accounts",
        token,
        { fields: "id,instagram_business_account{id}", limit: "100" },
        PageSchema,
        10
      );

      const page = pages.items.find(
        (candidate) =>
          candidate.instagram_business_account?.id === instagramAccountId
      );

      return yield* page === undefined
        ? Effect.fail(
            new AdNetworkRefused({ code: "pageNotReached", kind: "permission" })
          )
        : Effect.succeed(page.id);
    });

    const creativeOf = Effect.fn("MetaAds.creativeOf")(function* creativeOf(
      token: Redacted.Redacted,
      object: Extract<NewObject, { readonly _tag: "ad" }>
    ) {
      const { post: shown } = object;

      if (shown.platform === "facebook") {
        // "ID of a Facebook Page post to use in an ad": `<page>_<post>`.
        return {
          object_story_id: shown.platformPostId.includes("_")
            ? shown.platformPostId
            : `${shown.accountId}_${shown.platformPostId}`,
        };
      }

      return {
        instagram_user_id: shown.accountId,
        object_id: yield* pageOf(token, shown.accountId),
        source_instagram_media_id: shown.platformPostId,
      };
    });

    const paramsOf = Effect.fn("MetaAds.paramsOf")(function* paramsOf(
      token: Redacted.Redacted,
      object: NewObject
    ) {
      if (object._tag === "campaign") {
        return {
          params: {
            buying_type: "AUCTION",
            // The budget is the ad set's.
            is_adset_budget_sharing_enabled: "false",
            name: object.name,
            objective: "OUTCOME_ENGAGEMENT",
            // Required on every campaign; Peal boosts none of the special
            // categories.
            special_ad_categories: "[]",
            status: "PAUSED",
          },
          path: "campaigns",
        };
      }

      if (object._tag === "adSet") {
        const { audience, budget } = object;

        return {
          params: {
            bid_strategy: "LOWEST_COST_WITHOUT_CAP",
            billing_event: "IMPRESSIONS",
            campaign_id: object.campaignId,
            end_time: iso(object.endsAt),
            name: object.name,
            optimization_goal: "POST_ENGAGEMENT",
            start_time: iso(object.startsAt),
            status: "PAUSED",
            targeting: JSON.stringify({
              age_max: audience.ageMax,
              age_min: audience.ageMin,
              geo_locations: { countries: audience.countries },
            }),
            ...(budget._tag === "total"
              ? { lifetime_budget: String(budget.amount) }
              : { daily_budget: String(budget.amount) }),
            // Who benefits from the ad and who pays for it, which an ad
            // set shown in the European Union carries.
            ...Option.match(object.beneficiary, {
              onNone: () => ({}),
              onSome: (beneficiary) => ({ dsa_beneficiary: beneficiary }),
            }),
            ...Option.match(object.payer, {
              onNone: () => ({}),
              onSome: (payer) => ({ dsa_payor: payer }),
            }),
          },
          path: "adsets",
        };
      }

      return {
        params: {
          adset_id: object.adSetId,
          creative: JSON.stringify(yield* creativeOf(token, object)),
          name: object.name,
          status: "PAUSED",
        },
        path: "ads",
      };
    });

    const create: AdNetworkClient["create"] = (token, accountId, object) =>
      paramsOf(token, object).pipe(
        Effect.flatMap(({ params, path }) =>
          post(`/act_${accountId}/${path}`, token, params, CreatedSchema)
        ),
        Effect.flatMap(({ id }) =>
          Effect.fromOption(decodeObjectId(id)).pipe(
            // An id Peal cannot keep: something was made, and it is not
            // known which.
            Effect.mapError(
              () =>
                new AdNetworkRefused({ code: "unreadableId", kind: "other" })
            )
          )
        )
      );

    const find: AdNetworkClient["find"] = (token, accountId, object) => {
      const fields = { fields: "id,name", limit: "100" };

      if (object._tag === "campaign") {
        // Whatever Peal made is paused: only those are read.
        return named(
          listed(
            `/act_${accountId}/campaigns`,
            token,
            { ...fields, effective_status: '["PAUSED"]' },
            NamedSchema,
            maxLookUpPages
          ),
          object.name
        );
      }

      return object._tag === "adSet"
        ? named(
            listed(
              `/${object.campaignId}/adsets`,
              token,
              fields,
              NamedSchema,
              maxLookUpPages
            ),
            object.name
          )
        : named(
            listed(
              `/${object.adSetId}/ads`,
              token,
              fields,
              NamedSchema,
              maxLookUpPages
            ),
            object.name
          );
    };

    const setRunning: AdNetworkClient["setRunning"] = (
      token,
      objectId,
      running
    ) =>
      post(
        `/${objectId}`,
        token,
        { status: running ? "ACTIVE" : "PAUSED" },
        UpdatedSchema
      ).pipe(Effect.asVoid);

    const isRunning: AdNetworkClient["isRunning"] = (token, objectId) =>
      get(`/${objectId}`, token, { fields: "status" }, StatusSchema).pipe(
        Effect.map(({ value }): LookUp<boolean> => {
          if (value.status === "ACTIVE") {
            return { _tag: "found", value: true };
          }

          return value.status === "PAUSED"
            ? { _tag: "found", value: false }
            : unknown;
        }),
        Effect.catch(() => Effect.succeed<LookUp<boolean>>(unknown))
      );

    const scopes =
      options.mode === "spend" ? [readScope, ...spendScopes] : [readScope];

    const client: AdNetworkClient = {
      account,
      accounts,
      authorizationUrl: (state) => {
        const url = new URL(
          `/${graphApiVersion}/dialog/oauth`,
          hosts.facebookDialog
        );

        url.search = new URLSearchParams({
          // Asks again for permissions the person declined before.
          auth_type: "rerequest",
          client_id: app.appId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: scopes.join(","),
          state,
        }).toString();

        return url.href;
      },
      complete: Effect.fn("MetaAds.complete")(function* complete(code) {
        const shortLived = yield* signingIn(
          tokenFor({ code: Redacted.make(code), redirect_uri: redirectUri })
        );

        const longLived = yield* signingIn(
          tokenFor({
            fb_exchange_token: Redacted.make(shortLived.access_token),
            grant_type: "fb_exchange_token",
          })
        );

        const token = Redacted.make(longLived.access_token);
        const now = yield* DateTime.now;

        const user = yield* signingIn(
          get("/me", token, { fields: "id" }, UserSchema)
        );

        const permissions = yield* signingIn(
          get("/me/permissions", token, {}, PermissionsSchema)
        );

        const granted = permissions.value.data
          .filter(({ status }) => status === "granted")
          .map(({ permission }) => permission);

        // Without reading, nothing of ads works: the person refused.
        if (!granted.includes(readScope)) {
          return yield* new AdSignInFailed({ reason: "denied" });
        }

        return {
          // A long-lived token says when it ends; one that does not has
          // no end, and stops when its person revokes it.
          expiresAt: Option.fromUndefinedOr(longLived.expires_in).pipe(
            Option.filter((seconds) => seconds > 0),
            Option.map((seconds) =>
              DateTime.addDuration(now, Duration.seconds(seconds))
            )
          ),
          platformUserId: user.value.id,
          scopes: granted,
          token,
        };
      }),
      create,
      find,
      isRunning,
      maySpend: (held) =>
        held.includes("ads_management") &&
        held.includes("pages_read_engagement") &&
        held.includes("pages_manage_ads"),
      network: "meta",
      setRunning,
      snapshot,
    };

    return client;
  }
);
