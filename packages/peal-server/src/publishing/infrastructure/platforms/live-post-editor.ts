import type { Effect, Option } from "effect";

import type {
  EditOutcome,
  RemovalFailure,
} from "#publishing/application/live-post-clients.ts";
import type { PublishingToken } from "#publishing/application/platform-credentials.ts";
import type { TargetOptions } from "#publishing/domain/target-options.ts";
import type { PlatformPostId } from "#shared/domain/publish-result.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";

/** What an edit replaces on the platform: one post's text, nothing else. */
export interface TextEdit {
  /** The target's options, which a platform may need sent again. */
  readonly options: Option.Option<TargetOptions>;
  readonly platformPostId: PlatformPostId;
  readonly text: string;
}

/**
 * Replaces the text of one post, or one part of a thread, on a platform
 * with the channel's token, keeping everything else of it: `edited` once
 * the platform shows the new text. Safe to repeat, as the same text again
 * changes nothing. A post the platform no longer has is `BadRequest`
 * `postGone`; a token it refused before doing anything is `TokenRejected`,
 * which the channels context renews once. A post Peal cannot tell is the
 * account's is refused before anything is sent (`invalidPlatformId`).
 */
export type LivePostEditor = (
  token: PublishingToken,
  edit: TextEdit
) => Effect.Effect<EditOutcome, RemovalFailure | TokenRejected>;

/** The code of an edit of a post the platform no longer has. */
export const postGone = "postGone";
