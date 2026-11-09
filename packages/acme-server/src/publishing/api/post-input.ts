import {
  InvalidTimeZone,
  PostNotFound,
  UnknownChannels,
  UnknownMedia,
} from "acme-contract";
import type { PostContent as ContentInput } from "acme-contract";
import type { DateTime } from "effect";
import { Array as Arr, Effect, Option, Schema } from "effect";

import { PostContent } from "#publishing/domain/post-content.ts";
import { Schedule } from "#publishing/domain/schedule.ts";
import {
  ChannelIdSchema,
  MediaAssetIdSchema,
  PostIdSchema,
} from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

// Requests carry ids and zones as strings. An id that is not even of the
// right form names nothing: it answers as one that names nothing here.

const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

const decodeMediaId = Schema.decodeUnknownOption(MediaAssetIdSchema);

const decodePostId = Schema.decodeUnknownOption(PostIdSchema);

const decodeTimeZone = Schema.decodeUnknownOption(TimeZoneIdSchema);

// The contract checks the same limits as the domain, so content that passed
// it always decodes.
const decodeContent = Schema.decodeUnknownEffect(PostContent);

const malformed = <A>(
  raw: readonly string[],
  decode: (id: string) => Option.Option<A>
) => raw.filter((id) => Option.isNone(decode(id)));

/** The channels a request names, or UnknownChannels for malformed ids. */
export const channelIdsFrom = (raw: readonly string[]) => {
  const invalid = malformed(raw, decodeChannelId);

  return Arr.isReadonlyArrayNonEmpty(invalid)
    ? Effect.fail(new UnknownChannels({ channelIds: invalid }))
    : Effect.succeed(raw.flatMap((id) => Option.toArray(decodeChannelId(id))));
};

/** The post's content, with its ids decoded. */
export const contentFrom = (input: ContentInput) =>
  Effect.gen(function* decodingContent() {
    const media = malformed(
      input.media.map(({ mediaId }) => mediaId),
      decodeMediaId
    );

    if (Arr.isReadonlyArrayNonEmpty(media)) {
      return yield* new UnknownMedia({ mediaIds: media });
    }

    yield* channelIdsFrom(input.overrides.map(({ channelId }) => channelId));

    return yield* decodeContent(input).pipe(Effect.orDie);
  });

/** The post a path names, or PostNotFound. */
export const postIdFrom = (raw: string) =>
  Option.match(decodePostId(raw), {
    onNone: () => Effect.fail(new PostNotFound()),
    onSome: Effect.succeed,
  });

/** A schedule at the instant, in the zone, or InvalidTimeZone. */
export const scheduleFrom = (at: DateTime.Utc, timeZone: string) =>
  Option.match(decodeTimeZone(timeZone), {
    onNone: () => Effect.fail(new InvalidTimeZone({ timeZone })),
    onSome: (zone) => Effect.succeed(new Schedule({ at, timeZone: zone })),
  });
