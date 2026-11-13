import type { DateTime } from "effect";
import { Array as Arr, Effect, Option, Schema } from "effect";
import {
  InvalidTimeZone,
  PostNotFound,
  QueueNotFound,
  SignatureNotFound,
  UnknownChannels,
  UnknownMedia,
  UnknownTags,
  NewPostSchema,
} from "peal-contract";
import type {
  ChannelOptions as OptionsInput,
  NewPost as NewPostInput,
  PostContent as ContentInput,
  PostTiming,
} from "peal-contract";

import type { KeyedRequest } from "#publishing/application/idempotency-keys.ts";
import type { Placement } from "#publishing/application/placement.ts";
import type { PresetAsk } from "#publishing/application/post-presets.ts";
import type { SendPostRequest } from "#publishing/application/post-scheduling.ts";
import { ChannelOptionsListSchema } from "#publishing/domain/channel-options.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import { QueueIdSchema } from "#publishing/domain/queue-id.ts";
import type { QueueId } from "#publishing/domain/queue-id.ts";
import { Schedule } from "#publishing/domain/schedule.ts";
import { SignatureIdSchema } from "#publishing/domain/signature-id.ts";
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

const decodeSignatureId = Schema.decodeUnknownOption(SignatureIdSchema);

const decodeTagId = Schema.decodeUnknownOption(TagIdSchema);

const decodeTimeZone = Schema.decodeUnknownOption(TimeZoneIdSchema);

const decodeQueueId = Schema.decodeUnknownOption(QueueIdSchema);

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

/** The post's content, with the ids of every part decoded. */
export const contentFrom = (input: ContentInput) =>
  Effect.gen(function* decodingContent() {
    const parts = [input, ...(input.followUps ?? [])];

    // Each part's media, and those its overrides give some channels.
    const media = malformed(
      parts.flatMap((part) => [
        ...part.media.map(({ mediaId }) => mediaId),
        ...part.overrides.flatMap((override) =>
          (override.media ?? []).map(({ mediaId }) => mediaId)
        ),
      ]),
      decodeMediaId
    );

    if (Arr.isReadonlyArrayNonEmpty(media)) {
      return yield* new UnknownMedia({ mediaIds: media });
    }

    yield* channelIdsFrom(
      parts.flatMap((part) => part.overrides.map(({ channelId }) => channelId))
    );

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

/** What a request names of what the workspace saved. */
export interface PresetInput {
  readonly channelSets?: readonly string[];
  readonly defaultSignatures?: boolean;
  readonly signatureId?: string;
}

/**
 * What a request asks of the workspace's saved items, with its ids
 * decoded: a signature id that is not even of the right form names none.
 */
export const presetsFrom = ({
  channelSets = [],
  defaultSignatures = false,
  signatureId,
}: PresetInput): Effect.Effect<PresetAsk, SignatureNotFound> =>
  signatureId === undefined
    ? Effect.succeed({
        channelSets,
        defaultSignatures,
        signatureId: Option.none(),
      })
    : Option.match(decodeSignatureId(signatureId), {
        onNone: () => Effect.fail(new SignatureNotFound()),
        onSome: (id) =>
          Effect.succeed({
            channelSets,
            defaultSignatures,
            signatureId: Option.some(id),
          }),
      });

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

/**
 * The queue a request names, if it names one: an id that is not even of
 * the right form is QueueNotFound.
 */
export const queueIdOf = (
  raw: string | undefined
): Effect.Effect<Option.Option<QueueId>, QueueNotFound> => {
  if (raw === undefined) {
    return Effect.succeed(Option.none());
  }

  return Option.match(decodeQueueId(raw), {
    onNone: () => Effect.fail(new QueueNotFound()),
    onSome: (queueId) => Effect.succeed(Option.some(queueId)),
  });
};

/** When a request says a post goes out, with its queue decoded. */
export const placementFrom = (
  when: PostTiming
): Effect.Effect<Placement, QueueNotFound> => {
  if (when._tag === "queue") {
    return queueIdOf(when.queueId).pipe(
      Effect.map((queueId): Placement => ({ _tag: "queue", queueId }))
    );
  }

  return Effect.succeed(
    when._tag === "at" ? { _tag: "at", at: when.at } : { _tag: "now" }
  );
};

/** The zone a request's time is chosen in: UTC unless it says. */
export const zoneOf = (when: PostTiming): string =>
  when._tag === "queue" ? "UTC" : (when.timeZone ?? "UTC");

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
    const presets = yield* presetsFrom(input);

    const { when } = input;

    // One channel at least, unless a channel set or a queue brings some.
    if (
      channelIds.length === 0 &&
      presets.channelSets.length === 0 &&
      when._tag !== "queue"
    ) {
      return yield* new UnknownChannels({ channelIds: [] });
    }

    const timeZone = zoneOf(when);

    const zone = yield* Option.match(decodeTimeZone(timeZone), {
      onNone: () => Effect.fail(new InvalidTimeZone({ timeZone })),
      onSome: Effect.succeed,
    });

    const request: SendPostRequest = {
      allowDuplicate: input.allowDuplicate ?? false,
      channelIds,
      content: yield* contentFrom(input.content),
      idempotency: yield* keyedFrom(input, key),
      options: yield* optionsFrom(input.options ?? []),
      placement: yield* placementFrom(when),
      presets,
      shortenLinks: input.shortenLinks,
      ...(yield* tagsGiven(input.tagIds)),
      timeZone: zone,
    };

    return request;
  });
