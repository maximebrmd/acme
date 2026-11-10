import { Schema } from "effect";

/**
 * How close two posts with the same content on one channel must be, by the
 * times they go out, for the second to be refused: less than this many
 * hours, the shortest day a time zone has.
 */
export const duplicateWindowHours = 23;

/** A channel that already has the content, and the post that sends it. */
export const DuplicateOnChannelSchema = Schema.Struct({
  channelId: Schema.String,
  postId: Schema.String,
}).annotate({ identifier: "DuplicateOnChannel" });

export type DuplicateOnChannel = typeof DuplicateOnChannelSchema.Type;

/** Another post already sends the same content to some of the channels. */
export class DuplicatePost extends Schema.TaggedError<DuplicatePost>()(
  "DuplicatePost",
  {
    // One per channel that has it, with the post nearest in time.
    duplicates: Schema.Array(DuplicateOnChannelSchema),
  },
  {
    description: `Another post of the workspace sends the same content (the text the channel receives and the same media, in the same order) to some of the same channels, less than ${duplicateWindowHours} hours from this one's time: nothing was made. \`duplicates\` names each such channel and that post. Only posts that go out or went out count: not drafts, cancelled posts, nor a channel where the post failed. When it is meant, send the request again with \`allowDuplicate: true\`.`,
    httpApiStatus: 409,
  }
) {}
