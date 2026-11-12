import type { PostDraft, PostToValidate } from "peal-contract";

/**
 * What the composer asks `posts.validate` for its previews: the very
 * request a save would send, as a draft (no `when`), but its tags, which
 * change nothing the post would be. So the preview is the post, signatures,
 * options and short links included, not a guess.
 */
export const previewRequestOf = ({
  tagIds: _tags,
  ...checked
}: PostDraft): PostToValidate => checked;

/**
 * The composer's previews: the last answer shown, none before the first,
 * and whether a newer one is being asked (`loading`, the last one dimmed),
 * failed, or shown. `latest` numbers the last request sent.
 */
export interface PreviewState<A> {
  /** The post last asked about, as its request's key; none before. */
  readonly asked: string | null;
  readonly latest: number;
  readonly shown: A | null;
  readonly status: "failed" | "forbidden" | "idle" | "loading" | "shown";
}

/** What happened to a request of the previews, by its number. */
export type PreviewEvent<A> =
  | { readonly _tag: "asked"; readonly key: string; readonly request: number }
  | { readonly _tag: "answered"; readonly request: number; readonly value: A }
  | {
      readonly _tag: "failed";
      /** The member may not read what a check needs: no preview, then. */
      readonly forbidden: boolean;
      readonly request: number;
    };

/** Nothing asked yet. */
export const noPreview = <A>(): PreviewState<A> => ({
  asked: null,
  latest: 0,
  shown: null,
  status: "idle",
});

/**
 * The previews after an event: the latest request wins, and an answer or a
 * failure of an older one, which may arrive after it, changes nothing.
 */
export const previewed = <A>(
  state: PreviewState<A>,
  event: PreviewEvent<A>
): PreviewState<A> => {
  if (event._tag === "asked") {
    return {
      ...state,
      asked: event.key,
      latest: event.request,
      status: "loading",
    };
  }

  if (event.request !== state.latest) {
    return state;
  }

  return event._tag === "answered"
    ? { ...state, shown: event.value, status: "shown" }
    : { ...state, status: event.forbidden ? "forbidden" : "failed" };
};

/**
 * The previews as shown while the post is `key`: dimmed, as loading, from
 * the moment it differs from the post last asked about, before the pause
 * after the last change ends.
 */
export const previewOf = <A>(
  state: PreviewState<A>,
  key: string | undefined
): PreviewState<A> =>
  key !== undefined && key !== state.asked && state.status !== "forbidden"
    ? { ...state, status: "loading" }
    : state;
