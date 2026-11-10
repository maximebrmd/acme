import type { ReviewComment } from "peal-contract";

/** A comment that started a thread, and its answers, oldest first. */
export interface Thread {
  readonly answers: readonly ReviewComment[];
  readonly root: ReviewComment;
}

/** A post's comments as threads, in the order they started. */
export const threadsOf = (
  comments: readonly ReviewComment[]
): readonly Thread[] =>
  comments.flatMap((root) =>
    root.parentId === null
      ? [
          {
            answers: comments.filter(({ parentId }) => parentId === root.id),
            root,
          },
        ]
      : []
  );

/** Words of a channel's text a new comment is about. */
export interface ChosenWords {
  readonly channelId: string;
  readonly quote: string;
  readonly start: number;
}
