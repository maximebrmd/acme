import { Effect, Option, Schema } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import {
  asRemovalFailure,
  invalidPlatformId,
} from "#publishing/infrastructure/platforms/live-post-remover.ts";
import type { LivePostRemover } from "#publishing/infrastructure/platforms/live-post-remover.ts";
import { unanswered } from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { sessionOf } from "#shared/infrastructure/platforms/bluesky/bluesky-session.ts";
import { dpopSender } from "#shared/infrastructure/platforms/bluesky/dpop.ts";
import type { BlueskyHttp } from "#shared/infrastructure/platforms/bluesky/dpop.ts";

import { recordRefusal } from "./bluesky-refusal.ts";

const postCollection = "app.bsky.feed.post";

// A post's id is its record's AT URI: `at://<did>/<collection>/<rkey>`.
const postUriPattern =
  /^at:\/\/(?<did>did:[a-z]+:[\w.:%-]+)\/app\.bsky\.feed\.post\/(?<rkey>[\w.:~-]{1,512})$/u;

// The answer to a deletion: the commit that deleted the record, or none
// when there was no such record to delete.
const DeletedSchema = Schema.Struct({
  commit: Schema.optionalKey(Schema.Unknown),
});

/**
 * Deletes a post's record with com.atproto.repo.deleteRecord on the
 * account's PDS, with the session's DPoP-bound token: the post scope Peal
 * asks for allows `action=delete` on `app.bsky.feed.post`. The PDS answers
 * a record that is already gone with success and no `commit` (its
 * `api/com/atproto/repo/deleteRecord.ts`: "No-op if record already doesn't
 * exist", read 2026-11-11 at github.com/bluesky-social/atproto), which is
 * `alreadyGone`. A thread's gates (threadgate, postgate records) stay: the
 * scopes Peal holds on them allow `create` only, and a gate without its
 * post shows nothing. A post of another account is refused before any
 * call. Needs SecureRandom and Digest, for the proofs.
 */
export const blueskyLivePost = Effect.fn("BlueskyLivePost.make")(
  function* blueskyLivePost(options: { readonly api: BlueskyHttp }) {
    const dpop = yield* dpopSender(options.api);

    const remover: LivePostRemover = (token, platformPostId) =>
      Effect.gen(function* remove() {
        const session = yield* sessionOf(token.accessToken);
        const parts = postUriPattern.exec(platformPostId)?.groups;

        if (parts?.["did"] !== session.did || parts["rkey"] === undefined) {
          return yield* new BadRequest({ code: invalidPlatformId });
        }

        const response = yield* dpop
          .send(
            session,
            HttpClientRequest.post(
              new URL("/xrpc/com.atproto.repo.deleteRecord", session.pds)
            ).pipe(
              HttpClientRequest.bodyJsonUnsafe({
                collection: postCollection,
                repo: session.did,
                rkey: parts["rkey"],
              })
            )
          )
          .pipe(
            Effect.catchTags({
              HttpClientError: unanswered,
              OutboundRequestRefused: unanswered,
            })
          );

        if (response.status !== 200) {
          return yield* recordRefusal(response).pipe(
            Effect.mapError(asRemovalFailure)
          );
        }

        const deleted = yield* HttpClientResponse.schemaBodyJson(DeletedSchema)(
          response
        ).pipe(Effect.option);

        return Option.exists(deleted, ({ commit }) => commit === undefined)
          ? ("alreadyGone" as const)
          : ("removed" as const);
      });

    return remover;
  }
);
