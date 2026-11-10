import { Duration, Option, Schema } from "effect";
import type { NewComment } from "peal-contract";

import type { CommentDraft } from "#review/application/review-desk.ts";
import type { ShownRequest } from "#review/domain/approval-request.ts";
import {
  ReviewCommentIdSchema,
  ReviewLinkIdSchema,
} from "#review/domain/review-ids.ts";
import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";

// Requests carry ids as strings. An id that is not even of the right form
// names nothing: it answers as one that names nothing here.

export const postIdOf = Schema.decodeUnknownOption(PostIdSchema);

export const commentIdOf = Schema.decodeUnknownOption(ReviewCommentIdSchema);

export const linkIdOf = Schema.decodeUnknownOption(ReviewLinkIdSchema);

const channelIdOf = Schema.decodeUnknownOption(ChannelIdSchema);

/** The approval a decision names, as its reviewer was shown it. */
export const shownOf = ({
  approvalId,
  subjectHash,
}: {
  readonly approvalId: string;
  readonly subjectHash: string;
}): ShownRequest => ({ requestId: approvalId, subjectHash });

/** How long a link is asked to work, if the request says. */
export const lifetimeOf = (hours: number | undefined) =>
  Option.fromUndefinedOr(hours).pipe(Option.map(Duration.hours));

/**
 * A comment as the use cases take it. None when it names a comment or a
 * channel by an id of the wrong form, which names nothing: `problem` says
 * which.
 */
export const draftOf = (
  input: NewComment
):
  | { readonly _tag: "draft"; readonly draft: CommentDraft }
  | { readonly _tag: "invalid"; readonly problem: "anchor" | "parent" } => {
  const parentId = Option.fromUndefinedOr(input.parentId).pipe(
    Option.map(commentIdOf)
  );

  if (Option.isSome(parentId) && Option.isNone(parentId.value)) {
    return { _tag: "invalid", problem: "parent" };
  }

  const anchor = Option.fromUndefinedOr(input.anchor).pipe(
    Option.map(({ channelId, selection }) =>
      channelIdOf(channelId).pipe(
        Option.map((id) => ({
          channelId: id,
          selection: Option.fromUndefinedOr(selection),
        }))
      )
    )
  );

  if (Option.isSome(anchor) && Option.isNone(anchor.value)) {
    return { _tag: "invalid", problem: "anchor" };
  }

  return {
    _tag: "draft",
    draft: {
      anchor: Option.flatten(anchor),
      parentId: Option.flatten(parentId),
      text: input.text,
    },
  };
};
