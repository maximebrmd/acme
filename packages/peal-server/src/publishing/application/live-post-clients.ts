import { Context, Effect, Layer, Schema } from "effect";

import { BadRequest } from "#shared/domain/bad-request.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";

/**
 * A post, or a part of one, to delete from the channel's platform, by the
 * platform's id for it: ids only, so nothing a post says passes through
 * the gate.
 */
export const RemovalRequestSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  platformPostId: PlatformPostIdSchema,
});

export type RemovalRequest = typeof RemovalRequestSchema.Type;

/**
 * How a deletion ended: `removed`, or `alreadyGone`, when the platform
 * answered that there was no such post, which deleted is what was asked.
 * Where the platform does not tell the two apart (LinkedIn answers a
 * deletion done before as it answers the first), it is `removed`.
 */
export const RemovalOutcomeSchema = Schema.Literals(["removed", "alreadyGone"]);

export type RemovalOutcome = typeof RemovalOutcomeSchema.Type;

/**
 * Why a platform did not delete the post: it could not be reached, or the
 * request may be tried again later (`PlatformUnavailable`, with an
 * operator's code when the platform refuses the server's app), it asked
 * to wait (`RateLimited`), the channel's token is gone for good
 * (`TokenExpired`), or it refused the request (`BadRequest`, with Peal's
 * code when the channel cannot be used, or the platform's). Each means
 * the post may still be there; deleting again is safe either way.
 *
 * Workflows store these in their history: add members, never rename or
 * remove one.
 */
export const RemovalFailureSchema = Schema.Union([
  PlatformUnavailable,
  RateLimited,
  TokenExpired,
  BadRequest,
]);

export type RemovalFailure = typeof RemovalFailureSchema.Type;

/**
 * Deletes posts from the platforms, as the channel's account. One adapter
 * per platform, in a registry that does not compile without an entry for
 * each (`platforms/live-post-clients-live.ts`); a platform where Peal
 * cannot delete (`#publishing/domain/live-post-support.ts`) answers
 * `BadRequest` `notSupported` without a call.
 */
export class LivePostClients extends Context.Service<
  LivePostClients,
  {
    readonly remove: (
      request: RemovalRequest
    ) => Effect.Effect<RemovalOutcome, RemovalFailure>;
  }
>()("peal-server/publishing/application/LivePostClients") {
  /** Deletes nothing: every platform is unavailable. */
  static readonly none = Layer.succeed(
    LivePostClients,
    LivePostClients.of({
      remove: () => Effect.fail(new PlatformUnavailable()),
    })
  );
}
