import { Effect, Option, Schema } from "effect";
import { CurrentMember, maxFeedsPerWorkspace } from "peal-contract";

import { FeedTools } from "#app/mcp/feeds-tools.ts";
import { notAllowed, refuse } from "#app/mcp/refusals.ts";
import {
  feedItemView,
  feedPreviewView,
  feedView,
} from "#publishing/api/feed-view.ts";
import { channelIdsFrom, queueIdOf } from "#publishing/api/post-input.ts";
import type { ChangeFeedRequest } from "#publishing/application/feeds.ts";
import { Feeds } from "#publishing/application/feeds.ts";
import { ChannelSetIdSchema } from "#publishing/domain/channel-set-id.ts";
import { FeedIdSchema } from "#publishing/domain/feed-id.ts";
import type { Feed } from "#publishing/domain/feed.ts";
import { actorOf } from "#shared/api/actor.ts";
import { authorize } from "#shared/domain/authorize.ts";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

const decodeFeedId = Schema.decodeUnknownOption(FeedIdSchema);
const decodeSetId = Schema.decodeUnknownOption(ChannelSetIdSchema);

// What the use cases' refusals tell the user, through their MCP client.

const noFeed = () =>
  refuse(
    "The workspace follows no feed with this id: list_feeds answers its feeds."
  );

const feedIdFrom = (raw: string) =>
  Option.match(decodeFeedId(raw), { onNone: noFeed, onSome: Effect.succeed });

const noSet = () =>
  refuse(
    "The workspace has no channel set with this id: list_channel_sets answers its sets. Nothing was changed."
  );

const setIdOf = (raw: string | null | undefined) =>
  raw === undefined || raw === null
    ? Effect.succeed(Option.none())
    : Option.match(decodeSetId(raw), {
        onNone: noSet,
        onSome: (setId) => Effect.succeed(Option.some(setId)),
      });

const reasons = {
  credentials: "it carries a user name or a password",
  malformed: "it is not an address, or is longer than 2048 characters",
  notHttps: "Peal reads HTTPS addresses on the default port only",
  notPublic: "its host is not on the public internet",
};

const unreadable = {
  notAFeed: "what it gives is not RSS 2.0, Atom 1.0 or JSON Feed 1.1",
  tooLarge: "it is larger than the 2 MiB Peal reads",
  unreachable: "it gave no answer Peal could use",
};

const refusals = {
  ChannelSetNotFound: noSet,
  DatabaseError: Effect.die,
  FeedAddressRefused: ({ reason }: { readonly reason: keyof typeof reasons }) =>
    refuse(
      `Peal does not read this address: ${reasons[reason]}. Nothing was changed.`
    ),
  FeedReadsLimited: ({
    retryAfterSeconds,
  }: {
    readonly retryAfterSeconds: number;
  }) =>
    refuse(
      `The workspace had Peal read 30 addresses this hour, the most it may: try again in ${String(retryAfterSeconds)} seconds. Nothing was changed.`
    ),
  FeedTemplateInvalid: ({
    placeholder,
    reason,
  }: {
    readonly placeholder?: string | undefined;
    readonly reason: "empty" | "tooLong" | "unknownPlaceholder";
  }) =>
    refuse(
      reason === "unknownPlaceholder"
        ? `The template names {${placeholder ?? ""}}: only {title}, {link} and {summary} are replaced. Nothing was changed.`
        : `The template is ${reason === "empty" ? "empty" : "longer than 1000 characters"}. Nothing was changed.`
    ),
  FeedUnreadable: ({ reason }: { readonly reason: keyof typeof unreadable }) =>
    refuse(
      `Peal read the address and could not take it as a feed: ${unreadable[reason]}. Nothing was changed.`
    ),
  QueueNotFound: () =>
    refuse(
      "The workspace has no such queue, or no default queue: list_queues answers its queues. Nothing was changed."
    ),
  UnknownChannels: ({
    channelIds,
  }: {
    readonly channelIds: readonly string[];
  }) =>
    refuse(
      `These channels are not the workspace's, or no longer connected: ${channelIds.join(", ")}. Nothing was changed. list_channels answers its channels.`
    ),
} as const;

const viewOf = (feed: Feed) => feedView(feed);

export const FeedToolsLive = FeedTools.toLayer(
  Effect.gen(function* feedTools() {
    const feeds = yield* Feeds;
    const actor = CurrentMember.pipe(Effect.map(actorOf));

    return FeedTools.of({
      create_feed: (input) =>
        Effect.gen(function* create() {
          const member = yield* actor;

          const created = yield* feeds.create(member, {
            attachPicture: input.attachPicture ?? false,
            channelIds: yield* channelIdsFrom(input.channelIds ?? []),
            channelSetId: yield* setIdOf(input.channelSetId),
            mode: input.mode ?? "draft",
            queueId: yield* queueIdOf(input.queueId),
            template: Option.fromUndefinedOr(input.template),
            url: input.url,
          });

          return { feed: viewOf(created.feed), seen: created.seen };
        }).pipe(
          Effect.catchTags({
            ...refusals,
            MissingPermission: notAllowed(
              input.mode === "queue"
                ? "put a feed's posts on a queue"
                : "add feeds"
            ),
            TooManyFeeds: () =>
              refuse(
                `The workspace follows ${String(maxFeedsPerWorkspace)} feeds, the most it may: delete_feed one first.`
              ),
          })
        ),
      delete_feed: ({ feedId }) =>
        Effect.gen(function* remove() {
          yield* feeds.remove(yield* actor, yield* feedIdFrom(feedId)).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              FeedNotFound: noFeed,
              MissingPermission: notAllowed("delete this feed"),
            })
          );

          return { deleted: feedId };
        }),
      get_feed: ({ feedId }) =>
        Effect.gen(function* get() {
          const member = yield* actor;
          const id = yield* feedIdFrom(feedId);

          const found = yield* Effect.all([
            feeds.get(member, id),
            feeds.items(member, id),
          ]).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              FeedNotFound: noFeed,
              MissingPermission: notAllowed("read feeds"),
            })
          );

          return {
            feed: viewOf(found[0]),
            items: { items: found[1].map(feedItemView) },
          };
        }),
      list_feeds: () =>
        Effect.gen(function* list() {
          // Every feed: a workspace follows ten at most.
          const found = yield* feeds
            .list(yield* actor, Option.none(), 100)
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("read feeds"),
              })
            );

          return { feeds: found.map(viewOf) };
        }),
      preview_feed: ({ template, url }) =>
        Effect.gen(function* preview() {
          return yield* feeds
            .preview(yield* actor, url, Option.fromUndefinedOr(template))
            .pipe(
              Effect.map(feedPreviewView),
              Effect.catchTags({
                DatabaseError: Effect.die,
                FeedAddressRefused: refusals.FeedAddressRefused,
                FeedReadsLimited: refusals.FeedReadsLimited,
                FeedTemplateInvalid: refusals.FeedTemplateInvalid,
                FeedUnreadable: refusals.FeedUnreadable,
                MissingPermission: notAllowed("preview feeds"),
              })
            );
        }),
      update_feed: (input) =>
        Effect.gen(function* update() {
          const member = yield* actor;

          // Said before the feed is read: a queue takes a role that
          // schedules.
          if (input.mode === "queue") {
            yield* Effect.fromResult(authorize(member, "post:schedule"));
          }

          const id = yield* feedIdFrom(input.feedId);
          const change: Mutable<ChangeFeedRequest> = {};

          if (input.attachPicture !== undefined) {
            change.attachPicture = input.attachPicture;
          }

          if (input.channelIds !== undefined) {
            change.channelIds = yield* channelIdsFrom(input.channelIds);
          }

          if (input.channelSetId !== undefined) {
            change.channelSetId = yield* setIdOf(input.channelSetId);
          }

          if (input.mode !== undefined) {
            change.mode = input.mode;
          }

          if (input.queueId !== undefined) {
            change.queueId = yield* queueIdOf(input.queueId ?? undefined);
          }

          if (input.status !== undefined) {
            change.status = input.status;
          }

          if (input.template !== undefined) {
            change.template = input.template;
          }

          if (input.url !== undefined) {
            change.url = input.url;
          }

          return viewOf(yield* feeds.change(member, id, change));
        }).pipe(
          Effect.catchTags({
            ...refusals,
            FeedNotFound: noFeed,
            MissingPermission: notAllowed(
              input.mode === "queue"
                ? "put a feed's posts on a queue"
                : "change this feed"
            ),
          })
        ),
    });
  })
);
