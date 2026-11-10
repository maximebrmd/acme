import type { DateTime } from "effect";
import { Array as Arr, Effect, Option, Schema } from "effect";
import {
  InvalidTimeZone,
  PostNotFound,
  UnknownChannels,
  UnknownMedia,
  UnknownTags,
  NewPostSchema,
} from "peal-contract";
import type {
  ChannelOptions as OptionsInput,
  NewPost as NewPostInput,
  PostContent as ContentInput,
} from "peal-contract";

import type { KeyedRequest } from "#publishing/application/idempotency-keys.ts";
import type { SendPostRequest } from "#publishing/application/post-scheduling.ts";
import { ChannelOptionsListSchema } from "#publishing/domain/channel-options.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import { Schedule } from "#publishing/domain/schedule.ts";
import { TagIdSchema } from "#publishing/domain/tag-id.ts";
import type { TagId } from "#publishing/domain/tag-id.ts";
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

const decodeTargetId = Schema.decodeUnknownOption(PostTargetIdSchema);

const decodeTagId = Schema.decodeUnknownOption(TagIdSchema);

const decodeTimeZone = Schema.decodeUnknownOption(TimeZoneIdSchema);

// The contract checks the same limits as the domain, so content that passed
// it always decodes.
const decodeContent = Schema.decodeUnknownEffect(PostContent);

const decodeOptions = Schema.decodeUnknownEffect(ChannelOptionsListSchema);

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

/** The options a request gives on some channels, with their ids decoded. */
export const optionsFrom = (input: readonly OptionsInput[]) =>
  channelIdsFrom(input.map(({ channelId }) => channelId)).pipe(
    Effect.andThen(decodeOptions(input).pipe(Effect.orDie))
  );

/** The tags a request names, or UnknownTags for malformed ids. */
export const tagIdsFrom = (
  raw: readonly string[]
): Effect.Effect<readonly TagId[], UnknownTags> => {
  const invalid = malformed(raw, decodeTagId);

  return Arr.isReadonlyArrayNonEmpty(invalid)
    ? Effect.fail(new UnknownTags({ tagIds: invalid }))
    : Effect.succeed(raw.flatMap((id) => Option.toArray(decodeTagId(id))));
};

// The tags a request names, when it names any.
const tagsGiven = (
  raw: readonly string[] | undefined
): Effect.Effect<{ readonly tagIds?: readonly TagId[] }, UnknownTags> =>
  raw === undefined
    ? Effect.succeed({})
    : tagIdsFrom(raw).pipe(Effect.map((tagIds) => ({ tagIds })));

/** A draft's tags, as a request gives them: left out, nothing is said. */
export const draftTagsFrom = tagsGiven;

/** The post a path names, or PostNotFound. */
export const postIdFrom = (raw: string) =>
  Option.match(decodePostId(raw), {
    onNone: () => Effect.fail(new PostNotFound()),
    onSome: Effect.succeed,
  });

/** The post an id names, if it is a post id at all. */
export const postIdOption = (raw: string) => decodePostId(raw);

/**
 * The target of a post a path names, or PostNotFound: one that names no
 * target names nothing of the post.
 */
export const targetIdFrom = (raw: string) =>
  Option.match(decodeTargetId(raw), {
    onNone: () => Effect.fail(new PostNotFound()),
    onSome: Effect.succeed,
  });

/** A schedule at the instant, in the zone, or InvalidTimeZone. */
export const scheduleFrom = (at: DateTime.Utc, timeZone: string) =>
  Option.match(decodeTimeZone(timeZone), {
    onNone: () => Effect.fail(new InvalidTimeZone({ timeZone })),
    onSome: (zone) => Effect.succeed(new Schedule({ at, timeZone: zone })),
  });

// The request as JSON, whatever spelling it came in: an instant written
// with or without milliseconds is the same request.
const encodeNewPost = Schema.encodeEffect(Schema.toCodecJson(NewPostSchema));

const decodeJson = Schema.decodeUnknownEffect(Schema.Json);

const isJsonArray = Schema.is(Schema.Array(Schema.Json));

const isJsonObject = Schema.is(Schema.JsonObject);

// JSON with every object's keys in order, so the same request always reads
// the same.
const canonical = (value: Schema.Json): string => {
  if (isJsonArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }

  if (isJsonObject(value)) {
    const entries = Object.keys(value)
      .toSorted()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key] ?? null)}`);

    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value);
};

/**
 * The request with the idempotency key it came with, if any: the key, and
 * the request in a form that is the same every time the same one is sent.
 */
const keyedFrom = (input: NewPostInput, key: string | undefined) =>
  key === undefined
    ? Effect.succeed(Option.none<KeyedRequest>())
    : encodeNewPost(input).pipe(
        Effect.flatMap(decodeJson),
        Effect.orDie,
        Effect.map((json) => Option.some({ fingerprint: canonical(json), key }))
      );

/**
 * A post to create and send in one call, with its ids and zone decoded,
 * and the idempotency key its request came with, if any. A `now` without
 * a zone is in UTC.
 */
export const sendRequestFrom = (input: NewPostInput, key?: string) =>
  Effect.gen(function* decodingNewPost() {
    const channelIds = yield* channelIdsFrom(input.channelIds);

    // The contract asks for one channel at least.
    if (!Arr.isReadonlyArrayNonEmpty(channelIds)) {
      return yield* new UnknownChannels({ channelIds: [] });
    }

    const { when } = input;
    const timeZone = when.timeZone ?? "UTC";

    const zone = yield* Option.match(decodeTimeZone(timeZone), {
      onNone: () => Effect.fail(new InvalidTimeZone({ timeZone })),
      onSome: Effect.succeed,
    });

    const request: SendPostRequest = {
      allowDuplicate: input.allowDuplicate ?? false,
      at: when._tag === "at" ? Option.some(when.at) : Option.none(),
      channelIds,
      content: yield* contentFrom(input.content),
      idempotency: yield* keyedFrom(input, key),
      options: yield* optionsFrom(input.options ?? []),
      ...(yield* tagsGiven(input.tagIds)),
      timeZone: zone,
    };

    return request;
  });
