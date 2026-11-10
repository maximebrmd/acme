import { Effect, Option } from "effect";

import type { MediaAssetId } from "#shared/domain/ids.ts";

import type { MediaPreview, MediaPreviews } from "./ports/media-previews.ts";
import type { ReviewedPost } from "./ports/reviewed-posts.ts";

/** The files a post shows that can be shown, by their id. */
export type ShownMedia = ReadonlyMap<MediaAssetId, MediaPreview>;

/** No file is handed out: each is named by its id and its alt text alone. */
export const noMedia: ShownMedia = new Map();

/** The post's files as its reviewers are shown them. */
export const shownMedia = (
  previews: MediaPreviews["Service"],
  post: ReviewedPost
): Effect.Effect<ShownMedia> =>
  Effect.forEach(
    post.media,
    ({ mediaId }) =>
      previews
        .of(post.workspaceId, mediaId)
        .pipe(Effect.map(Option.map((preview) => [mediaId, preview] as const))),
    { concurrency: 4 }
  ).pipe(
    Effect.map(
      (shown) => new Map(shown.flatMap((entry) => Option.toArray(entry)))
    )
  );
