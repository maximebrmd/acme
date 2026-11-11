import { assert, layer } from "@effect/vitest";
import { Context, DateTime, Effect, Layer, Option, Ref } from "effect";
import { SqlClient } from "effect/sql";

import { MeteredPosts } from "#billing/application/metered-posts.ts";
import type { PublishedPost } from "#billing/application/metered-posts.ts";
import { MeteredPostLedger } from "#billing/application/ports/metered-post-ledger.ts";
import { UsageLedger } from "#billing/application/ports/usage-ledger.ts";
import { RecordedUsage } from "#billing/application/recorded-usage.ts";
import type { PostWentOut } from "#billing/application/recorded-usage.ts";
import { DrizzleMeteredPostLedgerLive } from "#billing/infrastructure/drizzle-metered-post-ledger.ts";
import { DrizzleUsageLedgerLive } from "#billing/infrastructure/drizzle-usage-ledger.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { connectChannel } from "#channels/domain/channel.ts";
import type { Platform } from "#channels/domain/platform.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { PublicationOutcomes } from "#publishing/application/publication-outcomes.ts";
import type { LivePart } from "#publishing/domain/live-part.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import type { PostTargetStatus } from "#publishing/domain/post-target-status.ts";
import { PostTarget } from "#publishing/domain/post-target.ts";
import { createDraft } from "#publishing/domain/post.ts";
import { meteredOutcomes } from "#publishing/infrastructure/metered-publication-outcomes.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { DatabaseTest } from "#test/channels/support.ts";
import { contentOf } from "#test/publishing/support.ts";

const workspaceId = WorkspaceIdSchema.make(
  "6f7a8b9c-0d1e-4f2a-8b3c-4d5e6f7a8b9c"
);

const postId = PostIdSchema.make("00000000-0000-7000-8000-000000000101");

const onX = ChannelIdSchema.make("00000000-0000-7000-8000-000000000201");

const onMastodon = ChannelIdSchema.make("00000000-0000-7000-8000-000000000202");

const publishedAt = DateTime.makeUnsafe("2026-11-09T10:00:00Z");

// The post links to Peal on X, without a scheme, and says nothing of it on
// Mastodon, where it has its own text.
const post = createDraft(
  postId,
  workspaceId,
  contentOf("Read peal.social", {
    overrides: [[onMastodon, "Hello, Mastodon"]],
  }),
  Option.none()
);

const channelOn = (id: ChannelId, platform: Platform) =>
  connectChannel(
    {
      accountId: `account-${platform}`,
      avatarUrl: Option.none(),
      connection: Option.none(),
      displayName: Option.none(),
      handle: "@peal_example",
      id,
      platform,
      scopes: [],
      token: { _tag: "nonExpiring" },
      workspaceId,
    },
    publishedAt
  );

const channels = [channelOn(onX, "x"), channelOn(onMastodon, "mastodon")];

const targetOn = (channelId: ChannelId, status: PostTargetStatus) =>
  new PostTarget({
    channelId,
    id: PostTargetIdSchema.make("00000000-0000-7000-8000-000000000301"),
    liveParts: [],
    options: Option.none(),
    postId,
    round: 1,
    status,
  });

// A thread of three parts: the first and the last link to Peal.
const threadId = PostIdSchema.make("00000000-0000-7000-8000-000000000102");

const part = (text: string) =>
  new PostPart({ delaySeconds: 0, media: [], overrides: [], text });

const thread = createDraft(
  threadId,
  workspaceId,
  new PostContent({
    followUps: [part("No link here"), part("More at peal.social/more")],
    media: [],
    overrides: [],
    text: "Read peal.social",
  }),
  Option.none()
);

const liveIn = (round: number, index: number): LivePart => ({
  index,
  permalink: Option.none(),
  platformPostId: Option.none(),
  publishedAt: DateTime.add(publishedAt, { minutes: index }),
  round,
});

// The thread on X, in `round`, with these parts live.
const threadOn = (
  round: number,
  status: PostTargetStatus,
  liveParts: readonly LivePart[]
) =>
  new PostTarget({
    channelId: onX,
    id: PostTargetIdSchema.make("00000000-0000-7000-8000-000000000302"),
    liveParts,
    options: Option.none(),
    postId: threadId,
    round,
    status,
  });

const published: PostTargetStatus = {
  _tag: "published",
  permalink: Option.none(),
  platformPostId: Option.none(),
  publishedAt,
};

// What billing counted, metered and in its usage ledger, and what the
// outcomes behind were told, in order.
class Recorded extends Context.Service<
  Recorded,
  {
    readonly counted: Ref.Ref<readonly PublishedPost[]>;
    readonly told: Ref.Ref<readonly PostTargetStatus["_tag"][]>;
    readonly wentOut: Ref.Ref<readonly PostWentOut[]>;
  }
>()("test/publishing/Recorded") {
  static readonly layer = Layer.effect(
    Recorded,
    Effect.all({
      counted: Ref.make<readonly PublishedPost[]>([]),
      told: Ref.make<readonly PostTargetStatus["_tag"][]>([]),
      wentOut: Ref.make<readonly PostWentOut[]>([]),
    })
  );
}

const RepositoriesTest = Layer.mergeAll(
  Layer.mock(ChannelRepository, {
    get: (id) =>
      Effect.succeed(
        Option.fromUndefinedOr(channels.find((found) => found.id === id))
      ),
  }),
  Layer.mock(PostRepository, {
    find: (id) =>
      Effect.succeed(
        Option.fromUndefinedOr(
          [post, thread].find((known) => known.id === id)
        ).pipe(
          Option.map((known) => ({ execution: Option.none(), post: known }))
        )
      ),
  })
);

const OutcomesTest = meteredOutcomes(
  Layer.effect(
    PublicationOutcomes,
    Recorded.use(({ told }) =>
      Effect.succeed(
        PublicationOutcomes.of({
          resolved: () => Effect.void,
          settled: (target) =>
            Ref.update(told, (all) => [...all, target.status._tag]),
        })
      )
    )
  )
).pipe(
  Layer.provide(
    Layer.mergeAll(
      RepositoriesTest,
      Layer.effect(
        MeteredPosts,
        Recorded.use(({ counted }) =>
          Effect.succeed(
            MeteredPosts.of({
              ofWorkspace: () => Effect.succeed([]),
              published: (entry) =>
                Ref.update(counted, (all) => [...all, entry]),
            })
          )
        )
      ),
      Layer.effect(
        RecordedUsage,
        Recorded.use(({ wentOut }) =>
          Effect.succeed(
            RecordedUsage.of({
              postWentOut: (entry) =>
                Ref.update(wentOut, (all) => [...all, entry]),
            })
          )
        )
      )
    )
  ),
  Layer.provideMerge(Recorded.layer)
);

layer(OutcomesTest)("publication outcomes, metered", (it) => {
  it.effect(
    "tell billing of each post that went out, with or without a link, then tell the rest",
    () =>
      Effect.gen(function* meters() {
        const outcomes = yield* PublicationOutcomes;
        const { counted, told } = yield* Recorded;

        yield* outcomes.settled(targetOn(onX, published));
        yield* outcomes.settled(targetOn(onMastodon, published));
        yield* outcomes.settled(
          targetOn(onX, {
            _tag: "failed",
            code: Option.none(),
            failedAt: publishedAt,
            reason: "unavailable",
          })
        );

        assert.deepStrictEqual(yield* Ref.get(counted), [
          { platform: "x", publishedAt, withLink: true, workspaceId },
          { platform: "mastodon", publishedAt, withLink: false, workspaceId },
        ]);
        assert.deepStrictEqual(yield* Ref.get(told), [
          "published",
          "published",
          "failed",
        ]);
      })
  );

  it.effect(
    "count each part that went live in the round, with its own text's links, whatever came after",
    () =>
      Effect.gen(function* metersParts() {
        const outcomes = yield* PublicationOutcomes;
        const { counted } = yield* Recorded;
        const before = (yield* Ref.get(counted)).length;

        const failed: PostTargetStatus = {
          _tag: "failed",
          code: Option.none(),
          failedAt: publishedAt,
          reason: "contentRejected",
        };

        // Round 1 sent two parts, then the third was refused.
        yield* outcomes.settled(
          threadOn(1, failed, [liveIn(1, 0), liveIn(1, 1)])
        );

        // Round 2 sent the third: the first two were counted already.
        yield* outcomes.settled(
          threadOn(2, published, [liveIn(1, 0), liveIn(1, 1), liveIn(2, 2)])
        );

        assert.deepStrictEqual(
          (yield* Ref.get(counted))
            .slice(before)
            .map(({ platform, publishedAt: at, withLink }) => ({
              at,
              platform,
              withLink,
            })),
          [
            { at: liveIn(1, 0).publishedAt, platform: "x", withLink: true },
            { at: liveIn(1, 1).publishedAt, platform: "x", withLink: false },
            { at: liveIn(2, 2).publishedAt, platform: "x", withLink: true },
          ]
        );
      })
  );

  it.effect(
    "count each post that went out once per channel in the usage ledger, never a failure",
    () =>
      Effect.gen(function* countsUsage() {
        const outcomes = yield* PublicationOutcomes;
        const { wentOut } = yield* Recorded;
        const before = (yield* Ref.get(wentOut)).length;

        yield* outcomes.settled(targetOn(onX, published));
        yield* outcomes.settled(targetOn(onMastodon, published));
        yield* outcomes.settled(
          targetOn(onX, {
            _tag: "failed",
            code: Option.none(),
            failedAt: publishedAt,
            reason: "unavailable",
          })
        );
        yield* outcomes.settled(
          targetOn(onMastodon, {
            _tag: "unconfirmed",
            attemptedAt: publishedAt,
            reason: "noResponse",
          })
        );

        assert.deepStrictEqual((yield* Ref.get(wentOut)).slice(before), [
          { platform: "x", publishedAt, workspaceId },
          { platform: "mastodon", publishedAt, workspaceId },
        ]);
      })
  );

  it.effect(
    "count a thread once, when its first part goes out, and a repost that sends it again",
    () =>
      Effect.gen(function* countsThreads() {
        const outcomes = yield* PublicationOutcomes;
        const { wentOut } = yield* Recorded;
        const before = (yield* Ref.get(wentOut)).length;

        const failed: PostTargetStatus = {
          _tag: "failed",
          code: Option.none(),
          failedAt: publishedAt,
          reason: "contentRejected",
        };

        // Round 1 sent two parts of three, round 2 the third: one post.
        yield* outcomes.settled(
          threadOn(1, failed, [liveIn(1, 0), liveIn(1, 1)])
        );
        yield* outcomes.settled(
          threadOn(2, published, [liveIn(1, 0), liveIn(1, 1), liveIn(2, 2)])
        );

        // Round 3 sent nothing, round 4 the whole thread again: another
        // post on the platform.
        yield* outcomes.settled(threadOn(3, failed, []));
        yield* outcomes.settled(
          threadOn(4, published, [liveIn(4, 0), liveIn(4, 1), liveIn(4, 2)])
        );

        assert.deepStrictEqual((yield* Ref.get(wentOut)).slice(before), [
          { platform: "x", publishedAt: liveIn(1, 0).publishedAt, workspaceId },
          { platform: "x", publishedAt: liveIn(4, 0).publishedAt, workspaceId },
        ]);
      })
  );
});

// The outcomes behind fail for the post once billing counted it, so the
// settlement's transaction rolls back with both counts; the thread's
// settle.
const RollbackTest = meteredOutcomes(
  Layer.succeed(
    PublicationOutcomes,
    PublicationOutcomes.of({
      resolved: () => Effect.void,
      settled: (target) =>
        target.postId === postId
          ? Effect.fail(new DatabaseError({ cause: "settling failed" }))
          : Effect.void,
    })
  )
).pipe(
  Layer.provide(
    Layer.mergeAll(
      RepositoriesTest,
      MeteredPosts.layer.pipe(Layer.provide(DrizzleMeteredPostLedgerLive)),
      RecordedUsage.layer.pipe(Layer.provide(DrizzleUsageLedgerLive))
    )
  ),
  Layer.provideMerge(
    Layer.mergeAll(DrizzleUsageLedgerLive, DrizzleMeteredPostLedgerLive)
  ),
  Layer.provideMerge(DatabaseTest)
);

layer(RollbackTest)("publication outcomes, counted in Postgres", (it) => {
  it.effect("roll the counts back with the settlement", () =>
    Effect.gen(function* rollsBack() {
      const outcomes = yield* PublicationOutcomes;
      const sql = yield* SqlClient.SqlClient;
      const ledger = yield* UsageLedger;
      const metered = yield* MeteredPostLedger;
      const day = DateTime.startOf(publishedAt, "day");

      yield* sql
        .withTransaction(outcomes.settled(targetOn(onX, published)))
        .pipe(Effect.flip);

      assert.lengthOf(
        yield* ledger.ofWorkspace(workspaceId, { from: day, to: day }),
        0
      );
      assert.lengthOf(yield* metered.ofWorkspace(workspaceId), 0);

      yield* sql.withTransaction(
        outcomes.settled(threadOn(1, published, [liveIn(1, 0)]))
      );

      assert.deepStrictEqual(
        yield* ledger.ofWorkspace(workspaceId, { from: day, to: day }),
        [{ day, dimension: "x", meter: "publishedPosts", quantity: 1 }]
      );

      yield* ledger.eraseWorkspace(workspaceId);
      yield* metered.eraseWorkspace(workspaceId);
    })
  );
});
