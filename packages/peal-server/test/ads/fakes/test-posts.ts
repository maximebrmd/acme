import { Context, DateTime, Effect, Layer, Option, Ref } from "effect";

import { BoostJobs } from "#ads/application/ports/boost-jobs.ts";
import { OrganicCounts } from "#ads/application/ports/organic-counts.ts";
import type { OrganicOnChannel } from "#ads/application/ports/organic-counts.ts";
import { PromotablePosts } from "#ads/application/ports/promotable-posts.ts";
import type { PublishedOn } from "#ads/application/ports/promotable-posts.ts";
import type { BoostId } from "#ads/domain/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { newId } from "#shared/application/ids.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
} from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

interface Held extends PublishedOn {
  readonly workspaceId: WorkspaceId;
}

/** What a test says of a post it publishes. */
export interface PublishedAs {
  readonly accountId?: string;
  readonly connection?: string;
  readonly platform?: string;
  readonly platformPostId?: string;
}

/**
 * Stand-ins for what the other contexts tell ads: the posts a workspace
 * published (which a test adds with `publish`), their organic counts, and
 * the boosts' jobs, which are recorded, never run: a test places a boost
 * itself, when it says.
 */
export class TestPosts extends Context.Service<
  TestPosts,
  {
    /** A post published by the workspace on a channel of its own. */
    readonly publish: (
      workspaceId: WorkspaceId,
      as?: PublishedAs
    ) => Effect.Effect<PublishedOn>;
    readonly unpublish: (post: PublishedOn) => Effect.Effect<void>;
    readonly countOn: (
      post: PublishedOn,
      counts: { readonly likes: number; readonly replies: number }
    ) => Effect.Effect<void>;
    /** The boosts whose job was started, in order. */
    readonly started: Effect.Effect<readonly BoostId[]>;
  }
>()("peal-server/test/ads/TestPosts") {
  static readonly layer = Layer.effectContext(
    Effect.gen(function* TestPostsLive() {
      const ids = yield* Effect.context<Ids>();
      const held = yield* Ref.make<readonly Held[]>([]);
      const started = yield* Ref.make<readonly BoostId[]>([]);

      const counted = yield* Ref.make<
        ReadonlyMap<string, OrganicOnChannel["counts"]>
      >(new Map());

      const ofPost = (workspaceId: WorkspaceId, postId: string) =>
        Ref.get(held).pipe(
          Effect.map((all) =>
            all.filter(
              (post) =>
                post.workspaceId === workspaceId && post.postId === postId
            )
          )
        );

      return Context.make(TestPosts, {
        countOn: (post, counts) =>
          DateTime.now.pipe(
            Effect.flatMap((readAt) =>
              Ref.update(
                counted,
                (all) =>
                  new Map([
                    ...all,
                    [
                      post.targetId,
                      Option.some({
                        ...counts,
                        impressions: Option.none(),
                        readAt,
                        reposts: 0,
                      }),
                    ],
                  ])
              )
            )
          ),
        publish: (workspaceId, as = {}) =>
          Effect.gen(function* publishing() {
            const postId = yield* newId(PostIdSchema);

            const post: Held = {
              accountId: as.accountId ?? "700",
              channelId: yield* newId(ChannelIdSchema),
              connection: Option.fromUndefinedOr(as.connection),
              permalink: Option.none(),
              platform: as.platform ?? "facebook",
              platformPostId: as.platformPostId ?? `700_${postId.slice(-6)}`,
              postId,
              publishedAt: yield* DateTime.now,
              targetId: yield* newId(PostTargetIdSchema),
              workspaceId,
            };

            yield* Ref.update(held, (all) => [...all, post]);

            return post;
          }).pipe(Effect.provide(ids)),
        started: Ref.get(started),
        unpublish: (post) =>
          Ref.update(held, (all) =>
            all.filter(({ targetId }) => targetId !== post.targetId)
          ),
      }).pipe(
        Context.add(
          PromotablePosts,
          PromotablePosts.of({
            matching: (workspaceId, platformPostIds) =>
              Ref.get(held).pipe(
                Effect.map(
                  (all) =>
                    new Map(
                      all.flatMap((post) =>
                        post.workspaceId === workspaceId &&
                        platformPostIds.includes(post.platformPostId)
                          ? [
                              [
                                post.platformPostId,
                                {
                                  postId: post.postId,
                                  targetId: post.targetId,
                                },
                              ] as const,
                            ]
                          : []
                      )
                    )
                )
              ),
            ofPost,
          })
        ),
        Context.add(
          OrganicCounts,
          OrganicCounts.of({
            ofPost: (actor, postId) =>
              Effect.all([
                ofPost(actor.workspaceId, postId),
                Ref.get(counted),
              ]).pipe(
                Effect.map(([posts, counts]) =>
                  posts.map((post) => ({
                    channelId: post.channelId,
                    counts: counts.get(post.targetId) ?? Option.none(),
                    targetId: post.targetId,
                  }))
                )
              ),
          })
        ),
        Context.add(
          BoostJobs,
          BoostJobs.of({
            start: (boostId) => Ref.update(started, (all) => [...all, boostId]),
          })
        )
      );
    })
  );
}
