import { DateTime, Duration, Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClient, HttpClientError } from "effect/http";

import { MediaForPublishing } from "#publishing/application/media-for-publishing.ts";
import type { OutcomeUnknown } from "#publishing/application/outcome-unknown.ts";
import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import {
  defaultStepTiming,
  sequenced,
} from "#publishing/application/publication-steps.ts";
import type {
  LookUp,
  PublicationSteps,
  StepTiming,
} from "#publishing/application/publication-steps.ts";
import {
  defaultGoogleBusinessPostType,
  googleBusinessLocalTimeOf,
  GoogleBusinessOptions,
} from "#publishing/domain/google-business-options.ts";
import type {
  GoogleBusinessCallToAction,
  GoogleBusinessLocalTime,
  GoogleBusinessPostType,
} from "#publishing/domain/google-business-options.ts";
import {
  commitUnanswered,
  unanswered,
} from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { Published } from "#shared/domain/publish-result.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";

import {
  createRefusal,
  googleBusinessRefusalCodes,
  readRefusal,
} from "./google-business-refusal.ts";

/** The HTTP client the adapter sends through: the public one. */
export type GoogleBusinessHttp = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

export interface GoogleBusinessClientOptions {
  /** For API calls. */
  readonly api: GoogleBusinessHttp;
  /**
   * The My Business API's origin, `https://mybusiness.googleapis.com`, or a
   * fake's in tests.
   */
  readonly apiUrl: URL;
  readonly timing?: StepTiming;
}

// Reading an answer's body fails with these.
type AnswerError = HttpClientError.HttpClientError | Schema.SchemaError;

// A channel's account id: the location's name in the My Business API v4.
const locationPath = /^accounts\/[^/]+\/locations\/[^/]+$/u;

// A local post's name, under its location.
const postPath = /^accounts\/[^/]+\/locations\/[^/]+\/localPosts\/[^/]+$/u;

// How long Google may take to fetch the photos from the URLs given.
const photoUrlLifetime = Duration.hours(2);

// The photos Google takes (Business Profile's photo guidelines): the
// platform rules refuse other files before.
const formats: ReadonlySet<string> = new Set(["image/jpeg", "image/png"]);

// How far before the attempt the confirmation looks, for clocks that
// disagree a little.
const clockSkew = Duration.minutes(2);

// The location's posts a confirmation reads: the largest page, three at
// most. Google does not say in which order it lists them.
const listPageSize = 100;

const listPages = 3;

// Asks Google for the detail of its validation errors (its libraries page).
const detailedErrors = { "X-GOOG-API-FORMAT-VERSION": "2" } as const;

const topicTypes = {
  event: "EVENT",
  offer: "OFFER",
  standard: "STANDARD",
} as const satisfies Record<GoogleBusinessPostType, string>;

const actionTypes = {
  book: "BOOK",
  call: "CALL",
  learnMore: "LEARN_MORE",
  order: "ORDER",
  shop: "SHOP",
  signUp: "SIGN_UP",
} as const satisfies Record<GoogleBusinessCallToAction, string>;

// A local post, as create, get and list answer it: its name, where it is
// in its life, and its address in Google Search once it is live.
const LocalPostSchema = Schema.Struct({
  createTime: Schema.optionalKey(Schema.String),
  event: Schema.optionalKey(
    Schema.Struct({ title: Schema.optionalKey(Schema.String) })
  ),
  name: Schema.NonEmptyString,
  searchUrl: Schema.optionalKey(Schema.String),
  state: Schema.optionalKey(Schema.String),
  summary: Schema.optionalKey(Schema.String),
  topicType: Schema.optionalKey(Schema.String),
});

type LocalPost = typeof LocalPostSchema.Type;

// The post the create call answers, under the name Google gave it.
const CreatedPostSchema = Schema.Struct({
  ...LocalPostSchema.fields,
  name: Schema.String.check(Schema.isPattern(postPath)),
});

const LocalPostsSchema = Schema.Struct({
  localPosts: Schema.optionalKey(Schema.Array(LocalPostSchema)),
  nextPageToken: Schema.optionalKey(Schema.String),
});

/** What `prepare` made: the photos' public URLs, in order. */
export interface GoogleBusinessMedia {
  readonly photos: readonly string[];
}

const dateOf = ({ day, month, year }: GoogleBusinessLocalTime) => ({
  day,
  month,
  year,
});

const timeOf = ({ hours, minutes }: GoogleBusinessLocalTime) => ({
  hours,
  minutes,
  nanos: 0,
  seconds: 0,
});

// The event of an event or an offer: Google's TimeInterval needs all four
// of its fields.
const eventOf = (options: GoogleBusinessOptions) => {
  const start = googleBusinessLocalTimeOf(options.startsAt ?? "");
  const end = googleBusinessLocalTimeOf(options.endsAt ?? "");

  return start === undefined || end === undefined
    ? Option.none()
    : Option.some({
        schedule: {
          endDate: dateOf(end),
          endTime: timeOf(end),
          startDate: dateOf(start),
          startTime: timeOf(start),
        },
        title: options.title ?? "",
      });
};

// The button: an action and the address it opens, none for a call.
const callToActionOf = ({
  callToAction,
  callToActionUrl,
}: GoogleBusinessOptions) =>
  Option.fromUndefinedOr(callToAction).pipe(
    Option.map((action) =>
      action === "call" || callToActionUrl === undefined
        ? { actionType: actionTypes[action] }
        : { actionType: actionTypes[action], url: callToActionUrl }
    )
  );

/** An offer's own fields, as Google names them. */
interface NewOffer {
  couponCode?: string;
  redeemOnlineUrl?: string;
  termsConditions?: string;
}

const offerOf = (options: GoogleBusinessOptions): NewOffer => {
  const offer: NewOffer = {};

  if (options.couponCode !== undefined) {
    offer.couponCode = options.couponCode;
  }

  if (options.redeemUrl !== undefined) {
    offer.redeemOnlineUrl = options.redeemUrl;
  }

  if (options.terms !== undefined) {
    offer.termsConditions = options.terms;
  }

  return offer;
};

const optionsOf = (post: OutgoingPost): GoogleBusinessOptions =>
  post.options.pipe(
    Option.filter(Schema.is(GoogleBusinessOptions)),
    Option.getOrElse(() => new GoogleBusinessOptions({}))
  );

const typeOf = (options: GoogleBusinessOptions): GoogleBusinessPostType =>
  options.postType ?? defaultGoogleBusinessPostType;

/** What accounts.locations.localPosts.create takes of a post. */
export interface NewLocalPost {
  callToAction?: { readonly actionType: string; readonly url?: string };
  event?: Option.Option.Value<ReturnType<typeof eventOf>>;
  media?: readonly {
    readonly mediaFormat: "PHOTO";
    readonly sourceUrl: string;
  }[];
  offer?: NewOffer;
  summary?: string;
  topicType: string;
}

/**
 * The LocalPost the create call takes: the text as its summary, its topic
 * type, the event of an event or an offer, the offer's own fields, the
 * button of a standard post or an event (Google ignores one on an offer),
 * and each photo by its URL, the one media field a local post takes.
 */
export const localPostOf = (
  post: OutgoingPost,
  photos: readonly string[]
): NewLocalPost => {
  const options = optionsOf(post);
  const type = typeOf(options);
  const body: NewLocalPost = { topicType: topicTypes[type] };
  const event = eventOf(options);
  const callToAction = callToActionOf(options);

  if (post.text.trim() !== "") {
    body.summary = post.text;
  }

  if (type !== "standard" && Option.isSome(event)) {
    body.event = event.value;
  }

  if (type === "offer") {
    body.offer = offerOf(options);
  } else if (Option.isSome(callToAction)) {
    body.callToAction = callToAction.value;
  }

  if (photos.length > 0) {
    body.media = photos.map((sourceUrl) => ({
      mediaFormat: "PHOTO",
      sourceUrl,
    }));
  }

  return body;
};

const isSuccess = (response: HttpClientResponse.HttpClientResponse) =>
  response.status >= 200 && response.status < 300;

// The post as published: its name is its id, and its address the one
// Google Search shows it at, once Google gives it.
const publishedAs = (found: LocalPost): Published => {
  const platformPostId = PlatformPostIdSchema.make(found.name);
  const permalink = (found.searchUrl ?? "").trim();

  return permalink === ""
    ? { _tag: "published", platformPostId }
    : { _tag: "published", permalink, platformPostId };
};

const rejected = new BadRequest({
  code: googleBusinessRefusalCodes.postRejected,
});

// The location the channel posts to, as its account id names it.
const locationOf = (post: OutgoingPost) =>
  locationPath.test(post.accountId)
    ? Effect.succeed(post.accountId)
    : Effect.fail(
        new BadRequest({
          code: googleBusinessRefusalCodes.locationNotFound,
        })
      );

// Whether a listed post is the attempt's: made since it started, of
// its type, with its text and its event's title.
const isAttempt = (post: OutgoingPost) => {
  const sent = optionsOf(post);
  const type = typeOf(sent);
  const since = DateTime.subtractDuration(post.startedAt, clockSkew);

  return (listed: LocalPost): boolean =>
    listed.topicType === topicTypes[type] &&
    (listed.summary ?? "").trim() === post.text.trim() &&
    (type === "standard" ||
      (listed.event?.title ?? "").trim() === (sent.title ?? "").trim()) &&
    Option.fromUndefinedOr(listed.createTime).pipe(
      Option.flatMap((at) => DateTime.make(at)),
      Option.exists((at) =>
        DateTime.isGreaterThanOrEqualTo(DateTime.toUtc(at), since)
      )
    );
};

/**
 * Publishes a local post on a Business Profile location with the My
 * Business API v4: one POST to the location's `localPosts` makes it, its
 * photos fetched by Google from public URLs. Google answers the post with
 * its `state`: `REJECTED` (its content policy) refuses it; `PROCESSING` is
 * read again a few times, and a post still processing is published, as
 * Google has it.
 *
 * Google keeps no idempotency key. A post whose answer was lost is looked
 * for among the location's posts made since the attempt started, by its
 * type, its text and its event's title: found once, it is published; not
 * found proves nothing, as Google may not list it yet, so it is never sent
 * again and ends unconfirmed.
 */
export const googleBusinessClient = Effect.fn("GoogleBusinessClient.make")(
  function* googleBusinessClient(options: GoogleBusinessClientOptions) {
    const credentials = yield* PlatformCredentials;
    const media = yield* MediaForPublishing;
    const { api, apiUrl } = options;
    const timing = options.timing ?? defaultStepTiming;

    // Sends a request that makes nothing live with the channel's token,
    // renewed once if refused.
    const read = <A, I>(
      post: OutgoingPost,
      request: (
        token: Redacted.Redacted
      ) => HttpClientRequest.HttpClientRequest,
      schema: Schema.Codec<A, I>
    ) =>
      credentials.withToken(post.channelId, ({ accessToken }) =>
        api.execute(request(accessToken)).pipe(
          Effect.flatMap(
            (
              response
            ): Effect.Effect<A, AnswerError | PublishFailure | TokenRejected> =>
              isSuccess(response)
                ? HttpClientResponse.schemaBodyJson(schema)(response)
                : readRefusal(response)
          ),
          Effect.catchTags({
            HttpClientError: unanswered,
            OutboundRequestRefused: unanswered,
            SchemaError: unanswered,
          })
        )
      );

    const prepare = Effect.fn("GoogleBusinessClient.prepare")(function* prepare(
      post: OutgoingPost
    ) {
      yield* locationOf(post);

      const photos = yield* Effect.forEach(
        post.media,
        Effect.fnUntraced(function* photo(attachment) {
          const found = yield* media.describe(
            post.workspaceId,
            attachment.mediaId
          );

          if (!formats.has(found.contentType)) {
            return yield* new MediaRejected({ code: "unsupportedType" });
          }

          return yield* media.publicUrl(
            post.workspaceId,
            attachment.mediaId,
            photoUrlLifetime
          );
        }),
        { concurrency: 1 }
      );

      return { _tag: "ready", prepared: { photos } } as const;
    });

    // The post as Google has it now, or as it was known when Google does
    // not say.
    const reread = (post: OutgoingPost, known: LocalPost) =>
      read(
        post,
        (token) =>
          HttpClientRequest.get(new URL(`/v4/${known.name}`, apiUrl)).pipe(
            HttpClientRequest.bearerToken(token),
            HttpClientRequest.setHeaders(detailedErrors)
          ),
        LocalPostSchema
      ).pipe(Effect.orElseSucceed(() => known));

    // The post Google just made, once it is no longer processing, or as it
    // stands after a few looks. Nothing here fails the attempt but Google's
    // own rejection: the post exists, and a failure would send it again.
    const settledOf = Effect.fn("GoogleBusinessClient.settled")(
      function* settledOf(post: OutgoingPost, created: LocalPost) {
        let current = created;

        for (const delay of timing.confirmDelays) {
          if (current.state !== "PROCESSING") {
            break;
          }

          yield* Effect.sleep(delay);

          current = yield* reread(post, current);
        }

        return current.state === "REJECTED"
          ? yield* rejected
          : publishedAs({ ...current, name: created.name });
      }
    );

    const commit = Effect.fn("GoogleBusinessClient.commit")(function* commit(
      post: OutgoingPost,
      prepared: GoogleBusinessMedia
    ) {
      const location = yield* locationOf(post);

      const created = yield* credentials.withToken(
        post.channelId,
        ({ accessToken }) =>
          api
            .execute(
              HttpClientRequest.post(
                new URL(`/v4/${location}/localPosts`, apiUrl)
              ).pipe(
                HttpClientRequest.bearerToken(accessToken),
                HttpClientRequest.setHeaders(detailedErrors),
                HttpClientRequest.bodyJsonUnsafe(
                  localPostOf(post, prepared.photos)
                )
              )
            )
            .pipe(
              Effect.flatMap(
                (
                  response
                ): Effect.Effect<
                  LocalPost,
                  AnswerError | OutcomeUnknown | PublishFailure | TokenRejected
                > =>
                  isSuccess(response)
                    ? HttpClientResponse.schemaBodyJson(CreatedPostSchema)(
                        response
                      )
                    : createRefusal(response)
              ),
              Effect.catchTags({
                HttpClientError: commitUnanswered,
                OutboundRequestRefused: commitUnanswered,
                SchemaError: commitUnanswered,
              })
            )
      );

      return yield* settledOf(post, created);
    });

    const listed = (post: OutgoingPost, location: string, pageToken: string) =>
      read(
        post,
        (token) =>
          HttpClientRequest.get(
            new URL(`/v4/${location}/localPosts`, apiUrl)
          ).pipe(
            HttpClientRequest.setUrlParams(
              pageToken === ""
                ? { pageSize: listPageSize }
                : { pageSize: listPageSize, pageToken }
            ),
            HttpClientRequest.bearerToken(token),
            HttpClientRequest.setHeaders(detailedErrors)
          ),
        LocalPostsSchema
      );

    // Looks for the attempt's post among the location's. One match is the
    // post; none, or several, settles nothing.
    const lookUp = (post: OutgoingPost): Effect.Effect<LookUp> =>
      Effect.gen(function* lookingUp() {
        const location = yield* locationOf(post);
        const mine = isAttempt(post);
        const matches: LocalPost[] = [];
        let pageToken = "";

        for (let page = 0; page < listPages; page += 1) {
          const answer = yield* listed(post, location, pageToken);

          matches.push(...(answer.localPosts ?? []).filter(mine));
          pageToken = answer.nextPageToken ?? "";

          if (pageToken === "") {
            break;
          }
        }

        const [only, ...others] = matches;

        const found: LookUp =
          only === undefined ||
          others.length > 0 ||
          !postPath.test(only.name) ||
          only.state === "REJECTED"
            ? { _tag: "unknown" }
            : { _tag: "found", published: publishedAs(only) };

        return found;
      }).pipe(Effect.orElseSucceed((): LookUp => ({ _tag: "unknown" })));

    const steps: PublicationSteps<GoogleBusinessMedia> = {
      commit,
      confirmation: { _tag: "lookUp", lookUp },
      platform: "googleBusiness",
      // Google fetches the photos while the create call waits.
      poll: (_post, prepared) => Effect.succeed({ _tag: "ready", prepared }),
      prepare,
    };

    return sequenced(steps, timing);
  }
);
