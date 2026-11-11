import { Effect, Option } from "effect";
import { HttpClientRequest } from "effect/http";

import {
  asRemovalFailure,
  invalidPlatformId,
} from "#publishing/infrastructure/platforms/live-post-remover.ts";
import type { LivePostRemover } from "#publishing/infrastructure/platforms/live-post-remover.ts";
import { unanswered } from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { pinterestErrorCodeOf } from "#shared/infrastructure/platforms/pinterest-api.ts";

import type { PinterestHttp } from "./pinterest-client.ts";
import { refused } from "./pinterest-refusal.ts";

// Pinterest's Pin ids are numbers, written as strings.
const pinIdPattern = /^\d{1,30}$/u;

/**
 * Deletes a Pin with DELETE /v5/pins/{pin_id} (`pins/delete`), "a Pin
 * owned by the operation user_account", with the `pins:write` and
 * `boards:write` scopes Peal asks for: Pinterest's API description
 * (github.com/pinterest/api-description, v5/openapi.json, read
 * 2026-11-11), which answers 204 once it is deleted and 404 for a Pin it
 * does not have. Only a 404 with Pinterest's own error is `alreadyGone`:
 * without it, a server on the way answered. Other refusals read as
 * publishing's do.
 */
export const pinterestLivePost =
  (options: {
    readonly api: PinterestHttp;
    readonly apiUrl: URL;
  }): LivePostRemover =>
  (token, platformPostId) =>
    Effect.gen(function* remove() {
      if (!pinIdPattern.test(platformPostId)) {
        return yield* new BadRequest({ code: invalidPlatformId });
      }

      const response = yield* options.api
        .execute(
          HttpClientRequest.delete(
            new URL(`/v5/pins/${platformPostId}`, options.apiUrl)
          ).pipe(HttpClientRequest.bearerToken(token.accessToken))
        )
        .pipe(
          Effect.catchTags({
            HttpClientError: unanswered,
            OutboundRequestRefused: unanswered,
          })
        );

      if (response.status === 200 || response.status === 204) {
        return "removed" as const;
      }

      if (
        response.status === 404 &&
        Option.isSome(yield* pinterestErrorCodeOf(response))
      ) {
        return "alreadyGone" as const;
      }

      return yield* refused(response, "pin").pipe(
        Effect.mapError(asRemovalFailure)
      );
    });
