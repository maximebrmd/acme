import { Schema } from "effect";

/**
 * How far a Facebook reel's or story's call got, as the journal keeps it
 * (persisted contract: add members, never rename or remove one). Recorded
 * before the request that makes the post live, on every run, so a resumed
 * run reads the post on by its id instead of ending unconfirmed:
 *
 * - `preparing` a `reel`, a `videoStory` or a `photoStory`: this release's
 *   run began the call, under its own random `run`, before any upload. A
 *   call begun with nothing journaled was begun by a release before this
 *   one, which journaled nothing: whether its finish went is not known.
 * - `finishing` a `reel` or a `videoStory`: the finish of the video
 *   `videoId` is about to go.
 * - `finishing` a `photoStory`: `photo_stories` with the unpublished photo
 *   `photoId` is about to go.
 *
 * Ids Meta gave only, never text.
 */
export const FacebookFormatProgressSchema = Schema.Union([
  Schema.Struct({
    format: Schema.Literals(["reel", "videoStory", "photoStory"]),
    run: Schema.NonEmptyString,
    step: Schema.Literal("preparing"),
  }),
  Schema.Struct({
    format: Schema.Literals(["reel", "videoStory"]),
    step: Schema.Literal("finishing"),
    videoId: Schema.NonEmptyString,
  }),
  Schema.Struct({
    format: Schema.Literal("photoStory"),
    photoId: Schema.NonEmptyString,
    step: Schema.Literal("finishing"),
  }),
]);

export type FacebookFormatProgress = typeof FacebookFormatProgressSchema.Type;
