import { Match } from "effect";
import type { Effect } from "effect";

import type {
  RemovalFailure,
  RemovalOutcome,
} from "#publishing/application/live-post-clients.ts";
import type { OutcomeUnknown } from "#publishing/application/outcome-unknown.ts";
import type { PublishingToken } from "#publishing/application/platform-credentials.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import type { PlatformPostId } from "#shared/domain/publish-result.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";

/**
 * Deletes one post, or one part of a thread, from a platform with the
 * channel's token: `removed`, or `alreadyGone` when the platform has no
 * such post, which deleted is what was asked. A token the platform refused
 * before doing anything is `TokenRejected`, which the channels context
 * renews once. A post Peal cannot tell is the account's is refused before
 * anything is sent (`BadRequest` `invalidPlatformId`).
 */
export type LivePostRemover = (
  token: PublishingToken,
  platformPostId: PlatformPostId
) => Effect.Effect<RemovalOutcome, RemovalFailure | TokenRejected>;

/** The code of a post id Peal cannot tell belongs to the account. */
export const invalidPlatformId = "invalidPlatformId";

/**
 * A publishing refusal, read as a deletion's: a server error, which leaves
 * a post's fate unknown, says only that the platform did not answer, as
 * deleting again is safe; a refused file cannot happen, and reads as the
 * request refused.
 */
export const asRemovalFailure = (
  failure: OutcomeUnknown | PublishFailure | TokenRejected
): RemovalFailure | TokenRejected =>
  Match.valueTags(failure, {
    BadRequest: (refused): RemovalFailure => refused,
    MediaRejected: ({ code }): RemovalFailure => new BadRequest({ code }),
    OutcomeUnknown: (): RemovalFailure => new PlatformUnavailable(),
    PlatformUnavailable: (refused): RemovalFailure => refused,
    RateLimited: (refused): RemovalFailure => refused,
    TokenExpired: (refused): RemovalFailure => refused,
    TokenRejected: (refused) => refused,
  });
