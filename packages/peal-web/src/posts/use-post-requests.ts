"use client";

import { useAtomSet } from "@effect/atom-react";
import type { Post, PostDraft, PostSchedule } from "peal-contract";
import type { DateTime } from "effect";
import { Exit, Option } from "effect";
import { useState } from "react";

import {
  cancelPost,
  createPost,
  discardPost,
  postsKeys,
  reschedulePost,
  schedulePost,
  unschedulePost,
  updatePost,
} from "#posts/api.ts";
import type { ComposerFailure } from "#posts/composer-failure.ts";
import { failureOf } from "#posts/outcome.ts";

/**
 * The composer's requests, each answering with the post or none, and the
 * failure of the last one, which the composer shows. Every request refreshes
 * the posts queries, the calendar's included.
 */
export const usePostRequests = (workspaceId: string) => {
  const [failure, setFailure] = useState<ComposerFailure | null>(null);

  const create = useAtomSet(createPost, { mode: "promiseExit" });
  const update = useAtomSet(updatePost, { mode: "promiseExit" });
  const schedule = useAtomSet(schedulePost, { mode: "promiseExit" });
  const reschedule = useAtomSet(reschedulePost, { mode: "promiseExit" });
  const cancel = useAtomSet(cancelPost, { mode: "promiseExit" });
  const unschedule = useAtomSet(unschedulePost, { mode: "promiseExit" });
  const discard = useAtomSet(discardPost, { mode: "promiseExit" });

  const failed = <E extends ComposerFailure>(exit: Exit.Exit<unknown, E>) => {
    setFailure(
      Option.getOrElse(failureOf(exit), (): ComposerFailure => ({
        _tag: "Unexpected",
      }))
    );
  };

  const settled = <E extends ComposerFailure>(
    exit: Exit.Exit<Post, E>
  ): Option.Option<Post> => {
    if (Exit.isSuccess(exit)) {
      setFailure(null);

      return Option.some(exit.value);
    }

    failed(exit);

    return Option.none();
  };

  const params = (postId: string) => ({ postId, workspaceId });

  return {
    cancel: async (postId: string) =>
      settled(
        await cancel({ params: params(postId), reactivityKeys: postsKeys })
      ),
    /** Deletes the draft, and says whether it is gone. */
    discard: async (postId: string) => {
      const exit = await discard({
        params: params(postId),
        reactivityKeys: postsKeys,
      });

      if (Exit.isSuccess(exit)) {
        setFailure(null);

        return true;
      }

      failed(exit);

      return false;
    },
    fail: setFailure,
    failure,
    reschedule: async (postId: string, payload: PostSchedule) =>
      settled(
        await reschedule({
          params: params(postId),
          payload,
          reactivityKeys: postsKeys,
        })
      ),
    /** Creates the draft, or saves the one that has an id. */
    save: async (postId: string | undefined, payload: PostDraft) =>
      settled(
        postId === undefined
          ? await create({
              params: { workspaceId },
              payload,
              reactivityKeys: postsKeys,
            })
          : await update({
              params: params(postId),
              payload,
              reactivityKeys: postsKeys,
            })
      ),
    schedule: async (
      postId: string,
      payload: {
        readonly at: DateTime.Utc;
        readonly channelIds: readonly [string, ...string[]];
        readonly timeZone: string;
      }
    ) =>
      settled(
        await schedule({
          params: params(postId),
          payload,
          reactivityKeys: postsKeys,
        })
      ),
    unschedule: async (postId: string) =>
      settled(
        await unschedule({ params: params(postId), reactivityKeys: postsKeys })
      ),
  };
};
