import { DateTime, Effect, Option, Ref } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  FeedAddressRefused,
  FeedNotFound,
  Forbidden,
  maxFeedsPerWorkspace,
  TooManyFeeds,
} from "peal-contract";
import type { CurrentMember, Feed, Permission } from "peal-contract";

import type { Studio } from "./studio.ts";

// The studio's feeds. An address is read as a synthetic blog of two
// items, whatever it names, but for one that is not HTTPS: the server's
// own tests read real documents.

/** What the feeds take of the studio, which hands it over. */
export interface FeedsWorld {
  readonly allowed: (
    permission: Permission
  ) => Effect.Effect<unknown, Forbidden, CurrentMember>;
  readonly now: DateTime.Utc;
  readonly record: (studio: Studio, change: string) => Effect.Effect<void>;
  readonly workspaceId: string;
}

const readable = (url: string) =>
  url.startsWith("https://")
    ? Effect.void
    : Effect.fail(new FeedAddressRefused({ reason: "notHttps" }));

const feedIn = (studio: Studio, feedId: string) =>
  Ref.get(studio.state).pipe(
    Effect.flatMap(({ feeds }) =>
      Option.match(
        Option.fromUndefinedOr(feeds.find(({ id }) => id === feedId)),
        {
          onNone: () => Effect.fail(new FeedNotFound()),
          onSome: Effect.succeed,
        }
      )
    )
  );

/** The studio's feeds group, over what the rest of it holds. */
export const studioFeedsOf = (world: FeedsWorld) => {
  const inWorkspace = (workspaceId: string) =>
    workspaceId === world.workspaceId
      ? Effect.void
      : Effect.fail(new Forbidden());

  const saved = (studio: Studio, feed: Feed, change: string) =>
    Ref.update(studio.state, (current) => ({
      ...current,
      feeds: current.feeds.map((kept) => (kept.id === feed.id ? feed : kept)),
    })).pipe(Effect.andThen(world.record(studio, change)), Effect.as(feed));

  const groupLive = (studio: Studio) =>
    HttpApiBuilder.group(Api, "feeds", (handlers) =>
      handlers.handleAll({
        create: ({ params, payload }) =>
          Effect.gen(function* create() {
            yield* world.allowed("post:create");

            if (payload.mode === "queue") {
              yield* world.allowed("post:schedule");
            }

            yield* inWorkspace(params.workspaceId);
            yield* readable(payload.url);

            const { feeds } = yield* Ref.get(studio.state);

            if (feeds.length >= maxFeedsPerWorkspace) {
              return yield* new TooManyFeeds({ allowed: maxFeedsPerWorkspace });
            }

            const feed: Feed = {
              attachPicture: payload.attachPicture ?? false,
              channelIds: payload.channelIds ?? [],
              channelSetId: payload.channelSetId ?? null,
              createdAt: world.now,
              failingSince: null,
              id: `0190f3a0-0000-7000-8000-0000000fe${String(feeds.length + 1).padStart(3, "0")}`,
              lastCheckedAt: world.now,
              lastFailure: null,
              mode: payload.mode ?? "draft",
              nextCheckAt: DateTime.add(world.now, { hours: 1 }),
              queueId: payload.queueId ?? null,
              since: world.now,
              startedBy: "synthetic-member",
              startedVia: { id: null, name: null, via: "application" },
              status: "active",
              statusAt: null,
              stopReason: null,
              template: payload.template ?? "{title}\n\n{link}",
              title: "A synthetic blog",
              updatedAt: world.now,
              url: payload.url,
            };

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              feeds: [...current.feeds, feed],
            }));
            yield* world.record(studio, `feeds:create:${feed.id}`);

            return { feed, seen: 2 };
          }),
        delete: ({ params }) =>
          Effect.gen(function* remove() {
            yield* world.allowed("post:create");
            yield* inWorkspace(params.workspaceId);

            const feed = yield* feedIn(studio, params.feedId);

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              feeds: current.feeds.filter(({ id }) => id !== feed.id),
            }));
            yield* world.record(studio, `feeds:delete:${feed.id}`);
          }),
        get: ({ params }) =>
          Effect.gen(function* get() {
            yield* world.allowed("post:read");
            yield* inWorkspace(params.workspaceId);

            return yield* feedIn(studio, params.feedId);
          }),
        items: ({ params }) =>
          Effect.gen(function* items() {
            yield* world.allowed("post:read");
            yield* inWorkspace(params.workspaceId);
            yield* feedIn(studio, params.feedId);

            return {
              items: [
                {
                  itemAt: null,
                  outcome: "made" as const,
                  pictureSkipped: null,
                  postId: "0190f3a0-0000-7000-8000-00000000f001",
                  reason: null,
                  seenAt: world.now,
                },
                {
                  itemAt: null,
                  outcome: "skipped" as const,
                  pictureSkipped: null,
                  postId: null,
                  reason: "existing" as const,
                  seenAt: world.now,
                },
              ],
            };
          }),
        list: ({ params, query }) =>
          Effect.gen(function* list() {
            yield* world.allowed("post:read");
            yield* inWorkspace(params.workspaceId);

            const { feeds } = yield* Ref.get(studio.state);

            const from =
              query.cursor === undefined
                ? 0
                : feeds.findIndex(({ id }) => id === query.cursor) + 1;

            const limit = query.limit ?? 50;
            const page = feeds.slice(from, from + limit);

            return {
              items: page,
              nextCursor:
                from + limit < feeds.length ? (page.at(-1)?.id ?? null) : null,
            };
          }),
        preview: ({ params, payload }) =>
          Effect.gen(function* preview() {
            yield* world.allowed("post:create");
            yield* inWorkspace(params.workspaceId);
            yield* readable(payload.url);

            const template = payload.template ?? "{title}\n\n{link}";

            return {
              items: ["Second", "First"].map((title) => ({
                link: `https://blog.example/${title.toLowerCase()}`,
                picture: null,
                publishedAt: null,
                summary: null,
                text: template
                  .replaceAll("{title}", title)
                  .replaceAll(
                    "{link}",
                    `https://blog.example/${title.toLowerCase()}`
                  )
                  .replaceAll("{summary}", ""),
                title,
              })),
              title: "A synthetic blog",
            };
          }),
        update: ({ params, payload }) =>
          Effect.gen(function* update() {
            yield* world.allowed("post:create");

            if (payload.mode === "queue") {
              yield* world.allowed("post:schedule");
            }

            yield* inWorkspace(params.workspaceId);

            const feed = yield* feedIn(studio, params.feedId);

            if (payload.url !== undefined) {
              yield* readable(payload.url);
            }

            const status = payload.status ?? feed.status;

            return yield* saved(
              studio,
              {
                ...feed,
                attachPicture: payload.attachPicture ?? feed.attachPicture,
                channelIds: payload.channelIds ?? feed.channelIds,
                channelSetId:
                  payload.channelSetId === undefined
                    ? feed.channelSetId
                    : payload.channelSetId,
                mode: payload.mode ?? feed.mode,
                queueId:
                  payload.queueId === undefined
                    ? feed.queueId
                    : payload.queueId,
                status,
                statusAt: status === "active" ? null : world.now,
                stopReason: status === "stopped" ? feed.stopReason : null,
                template: payload.template ?? feed.template,
                url: payload.url ?? feed.url,
              },
              `feeds:update:${feed.id}`
            );
          }),
      })
    );

  return { groupLive };
};
