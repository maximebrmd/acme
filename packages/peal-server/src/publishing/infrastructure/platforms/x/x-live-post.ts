import { Effect, Option, Schema } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import {
  asRemovalFailure,
  invalidPlatformId,
} from "#publishing/infrastructure/platforms/live-post-remover.ts";
import type { LivePostRemover } from "#publishing/infrastructure/platforms/live-post-remover.ts";
import { unanswered } from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";

import type { XHttp } from "./x-client.ts";
import { postRefusal, XProblemSchema } from "./x-refusal.ts";

// X's post ids are 64-bit integers, written as strings.
const postIdPattern = /^\d{1,20}$/u;

const DeletedSchema = Schema.Struct({
  data: Schema.Struct({ deleted: Schema.Boolean }),
});

// X's problem for a post it does not have (its OpenAPI document's
// problem types, read 2026-11-11).
const notFoundProblem = "https://api.x.com/2/problems/resource-not-found";

const isNotFound = (response: HttpClientResponse.HttpClientResponse) =>
  HttpClientResponse.schemaBodyJson(XProblemSchema)(response).pipe(
    Effect.map(
      (problem) =>
        response.status === 404 ||
        problem.type === notFoundProblem ||
        (problem.errors ?? []).some(({ message }) =>
          (message ?? "").toLowerCase().includes("not found")
        )
    ),
    Effect.orElseSucceed(() => response.status === 404)
  );

/**
 * Deletes a post with DELETE /2/tweets/{id}, as the account whose token
 * signs it ("if owned by the authenticated user"), with the scopes Peal
 * asks for (`tweet.read`, `users.read`, `tweet.write`):
 * https://docs.x.com/x-api/posts/delete-post, read 2026-11-11. X answers
 * `data.deleted`; a post X does not have (404, or its `resource-not-found`
 * problem) is `alreadyGone`, and an answer that it deleted nothing is the
 * request refused (`notDeleted`). X's other refusals read as publishing's
 * do: the app refused for its billing waits with the operator's codes, a
 * 401 is the token, a 429 waits as long as X says.
 */
export const xLivePost =
  (options: { readonly api: XHttp; readonly apiUrl: URL }): LivePostRemover =>
  (token, platformPostId) =>
    Effect.gen(function* remove() {
      if (!postIdPattern.test(platformPostId)) {
        return yield* new BadRequest({ code: invalidPlatformId });
      }

      const response = yield* options.api
        .execute(
          HttpClientRequest.delete(
            new URL(`/2/tweets/${platformPostId}`, options.apiUrl)
          ).pipe(HttpClientRequest.bearerToken(token.accessToken))
        )
        .pipe(
          Effect.catchTags({
            HttpClientError: unanswered,
            OutboundRequestRefused: unanswered,
          })
        );

      if (response.status === 200) {
        const answer = yield* HttpClientResponse.schemaBodyJson(DeletedSchema)(
          response
        ).pipe(Effect.option);

        if (Option.exists(answer, ({ data }) => data.deleted)) {
          return "removed" as const;
        }

        return (yield* isNotFound(response))
          ? ("alreadyGone" as const)
          : yield* new BadRequest({ code: "notDeleted" });
      }

      if (response.status === 404 || (yield* isNotFound(response))) {
        return "alreadyGone" as const;
      }

      return yield* postRefusal(response).pipe(
        Effect.mapError(asRemovalFailure)
      );
    });
