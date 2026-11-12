import { Effect, Option, Schema } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  ChannelSetNotFound,
  CurrentMember,
  defaultFeedPageSize,
  FeedAddressRefused,
  FeedNotFound,
  FeedReadsLimited,
  FeedTemplateInvalid,
  FeedUnreadable,
  QueueNotFound,
  TooManyFeeds,
  UnknownChannels,
} from "peal-contract";

import type { ChangeFeedRequest } from "#publishing/application/feeds.ts";
import { Feeds } from "#publishing/application/feeds.ts";
import { ChannelSetIdSchema } from "#publishing/domain/channel-set-id.ts";
import { FeedIdSchema } from "#publishing/domain/feed-id.ts";
import { actorOf } from "#shared/api/actor.ts";
import { setAnswerHeader } from "#shared/api/answer-headers.ts";
import { forbidden } from "#shared/api/forbidden.ts";

import { feedItemView, feedPreviewView, feedView } from "./feed-view.ts";
import { channelIdsFrom, queueIdOf } from "./post-input.ts";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

const decodeFeedId = Schema.decodeUnknownOption(FeedIdSchema);

const decodeSetId = Schema.decodeUnknownOption(ChannelSetIdSchema);

const notFound = () => Effect.fail(new FeedNotFound());

const feedIdFrom = (raw: string) =>
  Option.match(decodeFeedId(raw), {
    onNone: notFound,
    onSome: Effect.succeed,
  });

const setIdOf = (raw: string | undefined) =>
  raw === undefined
    ? Effect.succeed(Option.none())
    : Option.match(decodeSetId(raw), {
        onNone: () => Effect.fail(new ChannelSetNotFound()),
        onSome: (setId) => Effect.succeed(Option.some(setId)),
      });

// What the use cases refuse, as the contract says it.
const refusals = {
  ChannelSetNotFound: () => Effect.fail(new ChannelSetNotFound()),
  DatabaseError: Effect.die,
  FeedAddressRefused: ({
    reason,
  }: {
    readonly reason: FeedAddressRefused["reason"];
  }) => Effect.fail(new FeedAddressRefused({ reason })),
  FeedReadsLimited: ({
    retryAfterSeconds,
  }: {
    readonly retryAfterSeconds: number;
  }) =>
    setAnswerHeader("Retry-After", String(retryAfterSeconds)).pipe(
      Effect.andThen(Effect.fail(new FeedReadsLimited({ retryAfterSeconds })))
    ),
  FeedTemplateInvalid: ({
    placeholder,
    reason,
  }: {
    readonly placeholder?: string | undefined;
    readonly reason: FeedTemplateInvalid["reason"];
  }) =>
    Effect.fail(
      new FeedTemplateInvalid(
        placeholder === undefined ? { reason } : { placeholder, reason }
      )
    ),
  FeedUnreadable: ({ reason }: { readonly reason: FeedUnreadable["reason"] }) =>
    Effect.fail(new FeedUnreadable({ reason })),
  MissingPermission: forbidden,
  QueueNotFound: () => Effect.fail(new QueueNotFound()),
  UnknownChannels: ({
    channelIds,
  }: {
    readonly channelIds: readonly string[];
  }) => Effect.fail(new UnknownChannels({ channelIds: [...channelIds] })),
} as const;

export const FeedsHandlers = HttpApiBuilder.group(
  Api,
  "feeds",
  Effect.fn(function* feedsHandlers(handlers) {
    const feeds = yield* Feeds;

    return handlers.handleAll({
      create: ({ payload }) =>
        Effect.gen(function* create() {
          const actor = actorOf(yield* CurrentMember);

          const created = yield* feeds
            .create(actor, {
              attachPicture: payload.attachPicture ?? false,
              channelIds: yield* channelIdsFrom(payload.channelIds ?? []),
              channelSetId: yield* setIdOf(payload.channelSetId),
              mode: payload.mode ?? "draft",
              queueId: yield* queueIdOf(payload.queueId),
              template: Option.fromUndefinedOr(payload.template),
              url: payload.url,
            })
            .pipe(
              Effect.catchTags({
                ...refusals,
                TooManyFeeds: ({ allowed }) =>
                  Effect.fail(new TooManyFeeds({ allowed })),
              })
            );

          return { feed: feedView(created.feed), seen: created.seen };
        }),
      delete: ({ params }) =>
        Effect.gen(function* remove() {
          const actor = actorOf(yield* CurrentMember);
          const feedId = yield* feedIdFrom(params.feedId);

          yield* feeds.remove(actor, feedId).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              FeedNotFound: notFound,
              MissingPermission: forbidden,
            })
          );
        }),
      get: ({ params }) =>
        Effect.gen(function* get() {
          const actor = actorOf(yield* CurrentMember);
          const feedId = yield* feedIdFrom(params.feedId);

          return yield* feeds.get(actor, feedId).pipe(
            Effect.map(feedView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              FeedNotFound: notFound,
              MissingPermission: forbidden,
            })
          );
        }),
      items: ({ params }) =>
        Effect.gen(function* items() {
          const actor = actorOf(yield* CurrentMember);
          const feedId = yield* feedIdFrom(params.feedId);

          const kept = yield* feeds.items(actor, feedId).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              FeedNotFound: notFound,
              MissingPermission: forbidden,
            })
          );

          return { items: kept.map(feedItemView) };
        }),
      list: ({ query }) =>
        Effect.gen(function* list() {
          const actor = actorOf(yield* CurrentMember);

          const after =
            query.cursor === undefined
              ? Option.none()
              : Option.some(
                  yield* Option.match(decodeFeedId(query.cursor), {
                    onNone: () => Effect.fail(new HttpApiError.BadRequest()),
                    onSome: Effect.succeed,
                  })
                );

          const limit = query.limit ?? defaultFeedPageSize;

          // One more than the page, to tell whether another follows.
          const listed = yield* feeds.list(actor, after, limit + 1).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );

          const page = listed.slice(0, limit);

          return {
            items: page.map(feedView),
            nextCursor:
              listed.length > limit ? (page.at(-1)?.id ?? null) : null,
          };
        }),
      preview: ({ payload }) =>
        Effect.gen(function* preview() {
          const actor = actorOf(yield* CurrentMember);

          return yield* feeds
            .preview(
              actor,
              payload.url,
              Option.fromUndefinedOr(payload.template)
            )
            .pipe(
              Effect.map(feedPreviewView),
              Effect.catchTags({
                DatabaseError: Effect.die,
                FeedAddressRefused: refusals.FeedAddressRefused,
                FeedReadsLimited: refusals.FeedReadsLimited,
                FeedTemplateInvalid: refusals.FeedTemplateInvalid,
                FeedUnreadable: refusals.FeedUnreadable,
                MissingPermission: forbidden,
              })
            );
        }),
      update: ({ params, payload }) =>
        Effect.gen(function* update() {
          const actor = actorOf(yield* CurrentMember);
          const feedId = yield* feedIdFrom(params.feedId);
          const change: Mutable<ChangeFeedRequest> = {};

          if (payload.attachPicture !== undefined) {
            change.attachPicture = payload.attachPicture;
          }

          if (payload.channelIds !== undefined) {
            change.channelIds = yield* channelIdsFrom(payload.channelIds);
          }

          if (payload.channelSetId !== undefined) {
            change.channelSetId = yield* setIdOf(
              payload.channelSetId ?? undefined
            );
          }

          if (payload.mode !== undefined) {
            change.mode = payload.mode;
          }

          if (payload.queueId !== undefined) {
            change.queueId = yield* queueIdOf(payload.queueId ?? undefined);
          }

          if (payload.status !== undefined) {
            change.status = payload.status;
          }

          if (payload.template !== undefined) {
            change.template = payload.template;
          }

          if (payload.url !== undefined) {
            change.url = payload.url;
          }

          return yield* feeds
            .change(actor, feedId, change)
            .pipe(
              Effect.map(feedView),
              Effect.catchTags({ ...refusals, FeedNotFound: notFound })
            );
        }),
    });
  })
);
