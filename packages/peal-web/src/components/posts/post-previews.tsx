"use client";

import { useAtomSet } from "@effect/atom-react";
import { Exit, Option } from "effect";
import type {
  Channel,
  MediaAttachment,
  PostDraft,
  PostValidation,
} from "peal-contract";
import type { ReactNode } from "react";
import { useEffect, useEffectEvent, useReducer, useRef, useState } from "react";

import { validatePost } from "#posts/api.ts";
import { useAttachedMedia } from "#posts/attached-media.ts";
import { failureOf } from "#posts/outcome.ts";
import type { PartDraft } from "#posts/parts.ts";
import {
  noPreview,
  previewed,
  previewOf,
  previewRequestOf,
  shouldAsk,
} from "#posts/post-preview.ts";
import type { PreviewEvent, PreviewState } from "#posts/post-preview.ts";

import { PostPreviewsView } from "./post-previews-view.tsx";

// How long the composer waits after the last change before it asks.
const previewDelayMillis = 1000;

const reducer = (
  state: PreviewState<PostValidation>,
  event: PreviewEvent<PostValidation>
) => previewed(state, event);

/**
 * Asks `posts.validate` for the post as it stands, a second after the last
 * change, and only when something changed: one request at a time in
 * effect, as an answer to an older request is dropped. Nothing is asked
 * while `request` is none.
 */
const usePostPreview = (
  workspaceId: string,
  request: PostDraft | undefined
) => {
  const validate = useAtomSet(validatePost, { mode: "promiseExit" });
  const [state, dispatch] = useReducer(reducer, undefined, noPreview);
  const requests = useRef(0);
  // Bumped by "Try again": the same post, asked once more.
  const [attempt, setAttempt] = useState(0);

  const key =
    request === undefined
      ? undefined
      : `${String(attempt)}:${JSON.stringify(request)}`;

  const ask = useEffectEvent(async (asked: string) => {
    if (request === undefined) {
      return;
    }

    requests.current += 1;
    const number = requests.current;

    dispatch({ _tag: "asked", key: asked, request: number });

    const exit = await validate({
      params: { workspaceId },
      payload: previewRequestOf(request),
    });

    dispatch(
      Exit.isSuccess(exit)
        ? { _tag: "answered", request: number, value: exit.value }
        : {
            _tag: "failed",
            forbidden: Option.exists(
              failureOf(exit),
              ({ _tag }) => _tag === "Forbidden"
            ),
            request: number,
          }
    );
  });

  // Nothing is asked again while the post is the one last asked about.
  // Asked once the post differs from the last one asked about, and never
  // again once the member was refused.
  const due = shouldAsk(state, key);

  useEffect(() => {
    const timer =
      due && key !== undefined
        ? window.setTimeout(() => {
            void ask(key);
          }, previewDelayMillis)
        : undefined;

    return () => {
      window.clearTimeout(timer);
    };
  }, [key, due]);

  return {
    retry: () => {
      setAttempt((count) => count + 1);
    },
    state: previewOf(state, key),
  };
};

/**
 * The previews beside the composer's text: what each selected channel will
 * receive, from the same request a save sends (`draft`), asked while the
 * post can be written, goes to a channel and holds no option the API would
 * refuse.
 */
export const PostPreviews = ({
  channels,
  children,
  draft,
  media,
  optionsTaken,
  parts,
  workspaceId,
  writable,
}: {
  readonly channels: readonly Channel[];
  /** The composer's text, which the previews sit beside. */
  readonly children: ReactNode;
  /** What a save of the post sends now. */
  readonly draft: PostDraft;
  readonly media: readonly MediaAttachment[];
  /** Whether the API takes the options as filled in. */
  readonly optionsTaken: boolean;
  readonly parts: readonly PartDraft[];
  readonly workspaceId: string;
  readonly writable: boolean;
}) => {
  const asked =
    writable && optionsTaken && draft.channelIds.length > 0 ? draft : undefined;

  const { retry, state } = usePostPreview(workspaceId, asked);

  // The post's media and then each part's, read once, split back in order.
  const attached = useAttachedMedia(workspaceId, [
    ...media,
    ...parts.flatMap((part) => part.media),
  ]);

  const partMedia = parts.map((part, index) => {
    const from =
      media.length +
      parts
        .slice(0, index)
        .reduce((count, before) => count + before.media.length, 0);

    return attached.slice(from, from + part.media.length);
  });

  // A post that can no longer be written is shown as it is elsewhere: its
  // text takes the whole width.
  if (!writable) {
    return <div className="flex flex-col">{children}</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {children}
      <PostPreviewsView
        channels={channels}
        media={attached.slice(0, media.length)}
        parts={partMedia}
        selected={draft.channelIds.length}
        shortenLinks={draft.shortenLinks === true}
        state={state}
        waitingForOptions={!optionsTaken}
        onRetry={retry}
      />
    </div>
  );
};
