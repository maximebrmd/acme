import { Effect, Layer, Option } from "effect";

import { ChannelDirectory } from "#channels/application/channel-directory.ts";
import { ReviewLocations } from "#engagement/application/ports/review-locations.ts";

/**
 * The locations, from the channels context's directory: its connected
 * Google Business Profile channels, a page of channels at a time.
 */
export const ChannelsReviewLocations = Layer.effect(
  ReviewLocations,
  Effect.gen(function* ChannelsReviewLocations() {
    const directory = yield* ChannelDirectory;

    return ReviewLocations.of({
      after: (after, limit) =>
        directory.after(after, limit).pipe(
          Effect.map((listed) => ({
            locations: listed
              .filter(({ platform }) => platform === "googleBusiness")
              .map(({ channelId, workspaceId }) => ({
                channelId,
                workspaceId,
              })),
            reached:
              listed.length < limit
                ? Option.none()
                : Option.fromUndefinedOr(listed.at(-1)?.channelId),
          }))
        ),
    });
  })
);
