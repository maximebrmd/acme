import { DateTime, Effect, Schema } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import type {
  OutgoingRepost,
  RepostClient,
} from "#publishing/application/platform-reposts.ts";
import { blueskyRepostCollection } from "#publishing/domain/follow-up-ability.ts";
import { platformRefusalCodes } from "#publishing/domain/own-refusals.ts";
import { invalidPlatformId } from "#publishing/infrastructure/platforms/live-post-remover.ts";
import {
  commitUnanswered,
  unanswered,
} from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { PublishResult } from "#shared/domain/publish-result.ts";
import { sessionOf } from "#shared/infrastructure/platforms/bluesky/bluesky-session.ts";
import type { BlueskySession } from "#shared/infrastructure/platforms/bluesky/bluesky-session.ts";
import { dpopSender } from "#shared/infrastructure/platforms/bluesky/dpop.ts";
import type { BlueskyHttp } from "#shared/infrastructure/platforms/bluesky/dpop.ts";
import { recordKeyOf } from "#shared/infrastructure/platforms/bluesky/record-key.ts";

import { recordRefusal, XrpcErrorSchema } from "./bluesky-refusal.ts";

const postCollection = "app.bsky.feed.post";

// A post's id is its record's AT URI: `at://<did>/<collection>/<rkey>`.
const postUriPattern =
  /^at:\/\/(?<did>did:[a-z]+:[\w.:%-]+)\/app\.bsky\.feed\.post\/(?<rkey>[\w.:~-]{1,512})$/u;

// A record named with the hash of what it holds: what a repost names.
const StrongRefSchema = Schema.Struct({
  cid: Schema.NonEmptyString,
  uri: Schema.NonEmptyString,
});

// The repost record read back by its key: what it reposts.
const StoredRepostSchema = Schema.Struct({
  value: Schema.Struct({
    subject: Schema.Struct({ uri: Schema.String }),
  }),
});

// The repost, by its record's AT URI.
const published = (session: BlueskySession, recordKey: string) =>
  ({
    _tag: "published",
    platformPostId: PlatformPostIdSchema.make(
      `at://${session.did}/${blueskyRepostCollection}/${recordKey}`
    ),
  }) satisfies PublishResult;

/**
 * Reposts the account's own post with an `app.bsky.feed.repost` record
 * (`subject`, the post's strong reference, and `createdAt`), made with
 * com.atproto.repo.createRecord on the account's PDS under a record key
 * chosen from the attempt (bsky.network/docs/bluesky-api/like-repost,
 * read 2026-11-14). It takes `repo:app.bsky.feed.repost?action=create`,
 * which Peal asks at sign-in. A resume reads the record back by its key,
 * and creates it only when it is absent, so a repost is never made twice.
 * A post of another account is refused before any call.
 */
export const blueskyRepost = Effect.fn("BlueskyRepost.make")(
  function* blueskyRepost(options: { readonly api: BlueskyHttp }) {
    const credentials = yield* PlatformCredentials;
    const dpop = yield* dpopSender(options.api);
    const { api } = options;

    const withSession = <A, E>(
      sent: OutgoingRepost,
      use: (session: BlueskySession) => Effect.Effect<A, E>
    ) =>
      credentials.withToken(sent.channelId, ({ accessToken }) =>
        sessionOf(accessToken).pipe(Effect.flatMap(use))
      );

    // The post as the repost names it: its address and its hash now.
    const strongRefOf = (session: BlueskySession, uri: string) =>
      Effect.gen(function* readingStrongRef() {
        const parts = postUriPattern.exec(uri)?.groups;

        if (parts?.["did"] !== session.did || parts["rkey"] === undefined) {
          return yield* new BadRequest({ code: invalidPlatformId });
        }

        const response = yield* api
          .get(new URL("/xrpc/com.atproto.repo.getRecord", session.pds), {
            urlParams: {
              collection: postCollection,
              repo: session.did,
              rkey: parts["rkey"],
            },
          })
          .pipe(
            Effect.catchTags({
              HttpClientError: unanswered,
              OutboundRequestRefused: unanswered,
            })
          );

        if (response.status === 200) {
          return yield* HttpClientResponse.schemaBodyJson(StrongRefSchema)(
            response
          ).pipe(
            Effect.catchTag("SchemaError", unanswered),
            Effect.catchTag("HttpClientError", unanswered)
          );
        }

        const error = yield* HttpClientResponse.schemaBodyJson(XrpcErrorSchema)(
          response
        ).pipe(Effect.option);

        return yield* error._tag === "Some" &&
        error.value.error === "RecordNotFound"
          ? new BadRequest({ code: platformRefusalCodes.replyTargetGone })
          : new PlatformUnavailable();
      });

    const create = (sent: OutgoingRepost) =>
      withSession(sent, (session) =>
        Effect.gen(function* creating() {
          const recordKey = recordKeyOf(sent.startedAt, sent.idempotencyKey);
          const subject = yield* strongRefOf(session, sent.platformPostId);

          const response = yield* dpop
            .send(
              session,
              HttpClientRequest.post(
                new URL("/xrpc/com.atproto.repo.createRecord", session.pds)
              ).pipe(
                HttpClientRequest.bodyJsonUnsafe({
                  collection: blueskyRepostCollection,
                  record: {
                    $type: blueskyRepostCollection,
                    createdAt: DateTime.formatIso(sent.startedAt),
                    subject,
                  },
                  repo: session.did,
                  rkey: recordKey,
                })
              )
            )
            .pipe(
              Effect.catchTags({
                HttpClientError: commitUnanswered,
                OutboundRequestRefused: commitUnanswered,
              })
            );

          return response.status === 200
            ? published(session, recordKey)
            : yield* recordRefusal(response);
        })
      ).pipe(
        Effect.catchTag("OutcomeUnknown", ({ reason }) =>
          Effect.succeed<PublishResult>({ _tag: "unconfirmed", reason })
        )
      );

    // Reads the attempt's record back by its key: there, it is this
    // repost; absent, it was never made, and is made now.
    const resume = (sent: OutgoingRepost) =>
      withSession(sent, (session) =>
        Effect.gen(function* lookUp() {
          const recordKey = recordKeyOf(sent.startedAt, sent.idempotencyKey);

          const response = yield* api.get(
            new URL("/xrpc/com.atproto.repo.getRecord", session.pds),
            {
              urlParams: {
                collection: blueskyRepostCollection,
                repo: session.did,
                rkey: recordKey,
              },
            }
          );

          if (response.status === 200) {
            const stored =
              yield* HttpClientResponse.schemaBodyJson(StoredRepostSchema)(
                response
              );

            return stored.value.subject.uri === sent.platformPostId
              ? ("found" as const)
              : ("unknown" as const);
          }

          const error = yield* HttpClientResponse.schemaBodyJson(
            XrpcErrorSchema
          )(response).pipe(Effect.option);

          return error._tag === "Some" && error.value.error === "RecordNotFound"
            ? ("absent" as const)
            : ("unknown" as const);
        }).pipe(
          Effect.orElseSucceed(() => "unknown" as const),
          Effect.map((found) => ({ found, session }))
        )
      ).pipe(
        Effect.flatMap(({ found, session }) => {
          if (found === "found") {
            return Effect.succeed<PublishResult>(
              published(
                session,
                recordKeyOf(sent.startedAt, sent.idempotencyKey)
              )
            );
          }

          return found === "absent"
            ? create(sent)
            : Effect.succeed<PublishResult>({
                _tag: "unconfirmed",
                reason: "interrupted",
              });
        })
      );

    const client: RepostClient = {
      platform: "bluesky",
      repost: create,
      resume,
    };

    return client;
  }
);
