import { Effect, Schema } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import { postGone } from "#publishing/infrastructure/platforms/live-post-editor.ts";
import type { LivePostEditor } from "#publishing/infrastructure/platforms/live-post-editor.ts";
import {
  asRemovalFailure,
  invalidPlatformId,
} from "#publishing/infrastructure/platforms/live-post-remover.ts";
import type { LivePostRemover } from "#publishing/infrastructure/platforms/live-post-remover.ts";
import { unanswered } from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";

import type { GoogleBusinessHttp } from "./google-business-client.ts";
import { readRefusal } from "./google-business-refusal.ts";

// A local post's name, under the channel's location.
const postNamePattern =
  /^accounts\/[\w-]+\/locations\/[\w-]+\/localPosts\/[\w-]+$/u;

const StatusSchema = Schema.Struct({
  error: Schema.Struct({ status: Schema.optionalKey(Schema.String) }),
});

const isNotFound = (response: HttpClientResponse.HttpClientResponse) =>
  HttpClientResponse.schemaBodyJson(StatusSchema)(response).pipe(
    Effect.map(({ error }) => error.status === "NOT_FOUND"),
    Effect.orElseSucceed(() => false)
  );

// A local post's name under the channel's location, or none.
const ownPost = (accountId: string, platformPostId: string) =>
  postNamePattern.test(platformPostId) &&
  platformPostId.startsWith(`${accountId}/localPosts/`);

/**
 * Deletes a local post with DELETE /v4/{name} on mybusiness.googleapis.com,
 * with `business.manage`: "Returns NOT_FOUND if the local post does not
 * exist", which is `alreadyGone`
 * (https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts/delete,
 * read 2026-11-11). Only a post under the channel's own location is asked
 * for. Other refusals read as publishing's do.
 */
export const googleBusinessLivePost =
  (options: {
    readonly api: GoogleBusinessHttp;
    readonly apiUrl: URL;
  }): LivePostRemover =>
  (token, platformPostId) =>
    Effect.gen(function* remove() {
      if (!ownPost(token.accountId, platformPostId)) {
        return yield* new BadRequest({ code: invalidPlatformId });
      }

      const response = yield* options.api
        .execute(
          HttpClientRequest.delete(
            new URL(`/v4/${platformPostId}`, options.apiUrl)
          ).pipe(
            HttpClientRequest.bearerToken(token.accessToken),
            HttpClientRequest.setHeader("X-GOOG-API-FORMAT-VERSION", "2")
          )
        )
        .pipe(
          Effect.catchTags({
            HttpClientError: unanswered,
            OutboundRequestRefused: unanswered,
          })
        );

      if (response.status >= 200 && response.status < 300) {
        return "removed" as const;
      }

      if (response.status === 404 && (yield* isNotFound(response))) {
        return "alreadyGone" as const;
      }

      return yield* readRefusal(response).pipe(
        Effect.mapError(asRemovalFailure)
      );
    });

/**
 * Replaces a local post's text with PATCH /v4/{name}?updateMask=summary on
 * mybusiness.googleapis.com, with `business.manage`: "You must specify
 * each field that is being updated in the mask", so the post's type,
 * event, offer, button and photos are left as they are
 * (https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts/patch,
 * and the "Edit Posts" example of
 * https://developers.google.com/my-business/content/posts-data , read
 * 2026-11-12). NOT_FOUND is a post gone (`postGone`). The reference
 * lists no error of its own: refusals read as publishing's do. Only a
 * post under the channel's own location is asked for.
 */
export const googleBusinessLiveEdit =
  (options: {
    readonly api: GoogleBusinessHttp;
    readonly apiUrl: URL;
  }): LivePostEditor =>
  (token, { platformPostId, text }) =>
    Effect.gen(function* edit() {
      if (!ownPost(token.accountId, platformPostId)) {
        return yield* new BadRequest({ code: invalidPlatformId });
      }

      const url = new URL(`/v4/${platformPostId}`, options.apiUrl);

      url.searchParams.set("updateMask", "summary");

      const response = yield* options.api
        .execute(
          HttpClientRequest.patch(url).pipe(
            HttpClientRequest.bearerToken(token.accessToken),
            HttpClientRequest.setHeader("X-GOOG-API-FORMAT-VERSION", "2"),
            HttpClientRequest.bodyJsonUnsafe({ summary: text })
          )
        )
        .pipe(
          Effect.catchTags({
            HttpClientError: unanswered,
            OutboundRequestRefused: unanswered,
          })
        );

      if (response.status >= 200 && response.status < 300) {
        return "edited" as const;
      }

      if (response.status === 404 && (yield* isNotFound(response))) {
        return yield* new BadRequest({ code: postGone });
      }

      return yield* readRefusal(response).pipe(
        Effect.mapError(asRemovalFailure)
      );
    });
