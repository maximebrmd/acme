import { Effect, Schema } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClientError } from "effect/http";

import { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import type {
  OutgoingRepost,
  RepostClient,
} from "#publishing/application/platform-reposts.ts";
import { invalidPlatformId } from "#publishing/infrastructure/platforms/live-post-remover.ts";
import { commitUnanswered } from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { PublishResult } from "#shared/domain/publish-result.ts";

import type { MastodonHttp } from "./mastodon-client.ts";
import { instanceOfAccount } from "./mastodon-client.ts";
import { statusRefusal } from "./mastodon-refusal.ts";
import type { MastodonRefusal } from "./mastodon-refusal.ts";

// The reblog Mastodon answers: a status of its own, naming the one it
// reblogs.
const ReblogSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  uri: Schema.String,
  url: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

// A status id, as Mastodon gives them: digits, or a server's own word.
const statusIdPattern = /^[\w-]{1,64}$/u;

export interface MastodonRepostOptions {
  readonly api: MastodonHttp;
  /** `https:`, or `http:` for tests against a local fake. */
  readonly scheme: "http:" | "https:";
}

/**
 * Reposts (boosts) the account's own status with
 * `POST /api/v1/statuses/:id/reblog` (docs.joinmastodon.org/methods/
 * statuses, read 2026-11-14: "Reshare a status on your own profile",
 * `write:statuses`, which Peal holds). Mastodon answers a status already
 * reblogged by the account with that reblog (its `ReblogService` finds
 * the account's reblog of it and returns it), so a resume sends the
 * request again: it never reposts twice. A call without an answer is
 * unconfirmed, as a post's would be.
 */
export const mastodonRepost = Effect.fn("MastodonRepost.make")(
  function* mastodonRepost(options: MastodonRepostOptions) {
    const credentials = yield* PlatformCredentials;

    const repost = (sent: OutgoingRepost) =>
      Effect.gen(function* reblog() {
        const instance = yield* instanceOfAccount(
          sent.accountId,
          options.scheme
        );

        if (!statusIdPattern.test(sent.platformPostId)) {
          return yield* new BadRequest({ code: invalidPlatformId });
        }

        return yield* credentials.withToken(sent.channelId, ({ accessToken }) =>
          options.api
            .execute(
              HttpClientRequest.post(
                new URL(
                  `/api/v1/statuses/${encodeURIComponent(sent.platformPostId)}/reblog`,
                  instance
                )
              ).pipe(HttpClientRequest.bearerToken(accessToken))
            )
            .pipe(
              Effect.flatMap(
                (
                  response
                ): Effect.Effect<
                  PublishResult,
                  | HttpClientError.HttpClientError
                  | Schema.SchemaError
                  | MastodonRefusal
                > =>
                  response.status === 200
                    ? HttpClientResponse.schemaBodyJson(ReblogSchema)(
                        response
                      ).pipe(
                        Effect.map(({ id, uri, url }): PublishResult => ({
                          _tag: "published",
                          permalink: url ?? uri,
                          platformPostId: PlatformPostIdSchema.make(id),
                        }))
                      )
                    : statusRefusal(response)
              ),
              Effect.catchTags({
                HttpClientError: commitUnanswered,
                OutboundRequestRefused: commitUnanswered,
                SchemaError: commitUnanswered,
              })
            )
        );
      }).pipe(
        Effect.catchTag("OutcomeUnknown", ({ reason }) =>
          Effect.succeed<PublishResult>({ _tag: "unconfirmed", reason })
        )
      );

    const client: RepostClient = {
      platform: "mastodon",
      repost,
      resume: repost,
    };

    return client;
  }
);
