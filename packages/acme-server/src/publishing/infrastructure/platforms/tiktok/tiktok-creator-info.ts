import { Duration, Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClient, HttpClientError } from "effect/http";

import { TikTokCreator } from "#publishing/domain/tiktok-creator.ts";
import type {
  TikTokBlock,
  TikTokPosting,
} from "#publishing/domain/tiktok-creator.ts";
import { TikTokPrivacyLevelSchema } from "#publishing/domain/tiktok-options.ts";
import { unanswered } from "#publishing/infrastructure/platforms/platform-exchange.ts";
import type { BadRequest } from "#shared/domain/bad-request.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { RateLimited } from "#shared/domain/rate-limited.ts";
import type { TokenExpired } from "#shared/domain/token-expired.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import {
  tiktokAnswer,
  tiktokErrorCodeOf,
} from "#shared/infrastructure/platforms/tiktok-api.ts";

import { tiktokRefusal } from "./tiktok-refusal.ts";

/** The HTTP client TikTok's adapters send through: the public one. */
export type TikTokHttp = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

/** How reading the creator's settings can fail; nothing changed either way. */
export type CreatorReadFailure =
  | BadRequest
  | PlatformUnavailable
  | RateLimited
  | TokenExpired
  | TokenRejected;

const CreatorInfoSchema = tiktokAnswer(
  Schema.Struct({
    comment_disabled: Schema.optionalKey(Schema.Boolean),
    creator_avatar_url: Schema.optionalKey(Schema.String),
    creator_nickname: Schema.optionalKey(Schema.String),
    creator_username: Schema.optionalKey(Schema.String),
    duet_disabled: Schema.optionalKey(Schema.Boolean),
    max_video_post_duration_sec: Schema.optionalKey(Schema.Number),
    privacy_level_options: Schema.optionalKey(Schema.Array(Schema.String)),
    stitch_disabled: Schema.optionalKey(Schema.Boolean),
  })
);

type CreatorData = NonNullable<typeof CreatorInfoSchema.Type.data>;

const decodePrivacyLevel = Schema.decodeUnknownOption(TikTokPrivacyLevelSchema);

// The codes creator info answers, intentionally in a 200, when the creator
// cannot post now.
const blocks: ReadonlyMap<string, TikTokBlock> = new Map([
  ["reached_active_user_cap", "clientLimit"],
  ["spam_risk_too_many_posts", "postLimit"],
  ["spam_risk_user_banned_from_posting", "banned"],
]);

const creatorOf = (data: CreatorData): TikTokCreator =>
  new TikTokCreator({
    avatarUrl: Option.fromUndefinedOr(data.creator_avatar_url).pipe(
      Option.filter((url) => url !== "")
    ),
    commentDisabled: data.comment_disabled ?? false,
    duetDisabled: data.duet_disabled ?? false,
    maxVideoDuration: Option.fromUndefinedOr(
      data.max_video_post_duration_sec
    ).pipe(
      Option.filter((seconds) => seconds > 0),
      Option.map((seconds) => Duration.seconds(seconds))
    ),
    nickname: data.creator_nickname ?? data.creator_username ?? "",
    // Audiences Acme does not know are left out: it cannot offer them.
    privacyLevels: (data.privacy_level_options ?? []).flatMap((level) =>
      Option.toArray(decodePrivacyLevel(level))
    ),
    stitchDisabled: data.stitch_disabled ?? false,
    username: data.creator_username ?? "",
  });

const postingOf = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<
  TikTokPosting,
  CreatorReadFailure | HttpClientError.HttpClientError | Schema.SchemaError
> =>
  tiktokErrorCodeOf(response).pipe(
    Effect.flatMap(
      (
        code
      ): Effect.Effect<
        TikTokPosting,
        | CreatorReadFailure
        | HttpClientError.HttpClientError
        | Schema.SchemaError
      > => {
        const blocked = code.pipe(
          Option.flatMap((named) => Option.fromUndefinedOr(blocks.get(named)))
        );

        if (Option.isSome(blocked)) {
          const posting: TikTokPosting = {
            _tag: "blocked",
            reason: blocked.value,
          };

          return Effect.succeed(posting);
        }

        if (response.status !== 200 || !Option.contains(code, "ok")) {
          return tiktokRefusal("read", response).pipe(
            Effect.catchTag("OutcomeUnknown", () =>
              Effect.fail(new PlatformUnavailable())
            )
          );
        }

        return HttpClientResponse.schemaBodyJson(CreatorInfoSchema)(
          response
        ).pipe(
          Effect.flatMap(({ data }) =>
            data === undefined
              ? Effect.fail(new PlatformUnavailable())
              : Effect.succeed<TikTokPosting>({
                  _tag: "ready",
                  creator: creatorOf(data),
                })
          )
        );
      }
    )
  );

/**
 * Reads the creator's posting settings with POST
 * /v2/post/publish/creator_info/query/ ("Query Creator Info", 20 requests
 * a minute per token), as TikTok asks before each post and when the
 * composer shows the account.
 */
export const queryCreator =
  (options: { readonly api: TikTokHttp; readonly apiUrl: URL }) =>
  (
    token: Redacted.Redacted
  ): Effect.Effect<TikTokPosting, CreatorReadFailure> =>
    HttpClientRequest.post(
      new URL("/v2/post/publish/creator_info/query/", options.apiUrl)
    ).pipe(
      HttpClientRequest.bearerToken(token),
      HttpClientRequest.bodyJsonUnsafe({}),
      options.api.execute,
      Effect.flatMap(postingOf),
      Effect.catchTags({
        HttpClientError: unanswered,
        OutboundRequestRefused: unanswered,
        SchemaError: unanswered,
      })
    );
