import { assert, describe, it } from "@effect/vitest";
import {
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Redacted,
  Result,
} from "effect";
import { Digest, Mac, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { ChannelUnusable } from "#channels/application/channel-unusable.ts";
import { CommentSource } from "#engagement/application/ports/comment-source.ts";
import { ReplySender } from "#engagement/application/ports/reply-sender.ts";
import type { SendRequest } from "#engagement/application/ports/reply-sender.ts";
import {
  beginSending,
  confirmReply,
  settleReply,
  writeReply,
} from "#engagement/domain/reply.ts";
import type { Reply } from "#engagement/domain/reply.ts";
import { linkedinCommentsDailyCalls } from "#engagement/infrastructure/platforms/linkedin/linkedin-engagement.ts";
import { platformEngagementWith } from "#engagement/infrastructure/platforms/platform-engagement.ts";
import { youtubeCommentsDailyUnits } from "#engagement/infrastructure/platforms/youtube/youtube-engagement.ts";
import { CurrentInboxPlatforms } from "#shared/application/current-inbox-platforms.ts";
import { youtubeCommentScope } from "#shared/domain/inbox-platform.ts";
import type { InboxPlatforms } from "#shared/domain/inbox-platform.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { metaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";
import type { AccountFailure } from "#test/analytics/access-log.ts";
import { channelAccessOf } from "#test/analytics/access-log.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";
import { memoryQuota } from "#test/engagement/fakes/fake-youtube-comments.ts";
import { makeWorld } from "#test/engagement/fakes/world.ts";
import type { World } from "#test/engagement/fakes/world.ts";
import {
  channelId,
  comment,
  memberId,
  replyId,
  thread,
  threadId,
} from "#test/engagement/support.ts";
import {
  json,
  platformServer,
} from "#test/publishing/fakes/platform-server.ts";
import type { PlatformAnswer } from "#test/publishing/fakes/platform-server.ts";

const youtubeOnly: InboxPlatforms = new Set(["youtube"]);

const linkedinOnly: InboxPlatforms = new Set(["linkedin"]);

// What the channel's gate runs for a reply, between the engagement tables
// and a loopback server answering as Mastodon: the last check before a
// public reply goes out.

const now = DateTime.makeUnsafe("2026-11-10T09:20:00.000Z");

const written = (): Reply =>
  writeReply(
    replyId(1),
    comment(1),
    Option.some(memberId),
    "Thank you, synthetic reader!",
    now
  );

const attempted = (): Reply => Result.getOrThrow(beginSending(written(), now));

const request: SendRequest = { channelId: channelId(1), replyId: replyId(1) };

const made: PlatformAnswer = json({
  id: "3001",
  url: "https://social.example/@studio/3001",
});

// The world holding `reply` under its comment and thread.
const worldWith = (reply: Reply): World => {
  const world = makeWorld();
  const post = thread(1);
  const kept = comment(1);

  world.state.threads.set(post.id, post);
  world.state.comments.set(kept.id, kept);
  world.state.replies.set(reply.id, reply);

  return world;
};

// The gate's sender over `world`, on a server that answers `answer`;
// `failure` is what the channels context says of the channel instead.
const onServer = Effect.fnUntraced(function* onServer(
  world: World,
  answer: PlatformAnswer,
  failure: Option.Option<AccountFailure> = Option.none(),
  on: {
    readonly inbox?: InboxPlatforms;
    readonly platform?:
      | "facebook"
      | "linkedinPage"
      | "linkedinProfile"
      | "mastodon"
      | "youtube";
  } = {}
) {
  const server = yield* platformServer(() => answer);
  const url = new URL(server.url);

  const youtube: ChannelAccount = {
    accountId: "UCsyntheticChannel000001",
    channelId: channelId(1),
    connection: Option.none(),
    platform: "youtube",
    scopes: [youtubeCommentScope],
  };

  const accounts: Readonly<
    Record<
      "facebook" | "linkedinPage" | "linkedinProfile" | "mastodon" | "youtube",
      ChannelAccount
    >
  > = {
    facebook: {
      accountId: "102000000000001",
      channelId: channelId(1),
      connection: Option.none(),
      platform: "facebook",
      scopes: ["pages_read_user_content", "pages_manage_engagement"],
    },
    linkedinPage: {
      accountId: "urn:li:organization:9000000001",
      channelId: channelId(1),
      connection: Option.some("linkedinPage"),
      platform: "linkedin",
      scopes: ["r_organization_social_feed", "w_organization_social_feed"],
    },
    linkedinProfile: {
      accountId: "syntheticMember1",
      channelId: channelId(1),
      connection: Option.some("linkedinProfile"),
      platform: "linkedin",
      scopes: ["openid", "profile", "w_member_social"],
    },
    mastodon: {
      accountId: `109372@${url.host}`,
      channelId: channelId(1),
      connection: Option.none(),
      platform: "mastodon",
      scopes: ["read:statuses", "write:statuses"],
    },
    youtube,
  };

  const account = accounts[on.platform ?? "mastodon"];

  const gate = platformEngagementWith({
    blueskyAppView: url,
    linkedinApi: url,
    linkedinReadCalls: linkedinCommentsDailyCalls,
    linkedinVersion: "202610",
    mastodonScheme: "http:",
    metaAppSecret: Option.some(Redacted.make("synthetic-meta-secret")),
    metaHosts: { ...metaHosts, facebookGraph: url, instagramGraph: url },
    youtubeApi: url,
    youtubeCommentUnits: youtubeCommentsDailyUnits,
  }).pipe(
    Layer.provide(Layer.succeed(CurrentInboxPlatforms, on.inbox ?? new Set())),
    Layer.provide(memoryQuota().layer)
  );

  const built = yield* Effect.all({
    sender: ReplySender,
    source: CommentSource,
  }).pipe(
    Effect.provide(
      gate.pipe(
        Layer.provide(
          Layer.mergeAll(
            world.ports,
            channelAccessOf(
              Option.getOrElse(failure, () => account),
              ["token-1"]
            ),
            FetchHttpClient.layer,
            OpenOutboundGuard,
            Digest.layerWebCrypto,
            Mac.layerWebCrypto.pipe(
              Layer.provideMerge(SecureRandom.layerWebCrypto)
            )
          )
        )
      )
    )
  );

  return { ...built, server };
});

const unknown = { _tag: "unconfirmed", reason: "interrupted" } as const;

describe("the gate's reply sender", () => {
  it.effect("sends a reply on its way, and records the call first", () =>
    Effect.gen(function* sends() {
      const world = worldWith(attempted());
      const { sender, server } = yield* onServer(world, made);

      const outcome = yield* sender.send(request);

      assert.strictEqual(outcome._tag, "sent");
      assert.lengthOf(server.requests(), 1);
      assert.isTrue(world.state.claims.has(replyId(1)));
    }).pipe(Effect.scoped)
  );

  it.effect(
    "calls the platform for no reply a person settled, sent or resumed",
    () =>
      Effect.gen(function* refuses() {
        // Handed over as stranded, then found missing by a member.
        const stranded = Result.getOrThrow(
          settleReply(attempted(), unknown, now)
        );

        const settled = Result.getOrThrow(confirmReply(stranded, false, now));
        const world = worldWith(settled);
        const { sender, server } = yield* onServer(world, made);

        assert.deepStrictEqual(yield* sender.send(request), unknown);
        assert.deepStrictEqual(yield* sender.resume(request), unknown);
        assert.lengthOf(server.requests(), 0);
        assert.isFalse(world.state.claims.has(replyId(1)));
      }).pipe(Effect.scoped)
  );

  it.effect(
    "never says a resumed reply did not go out because its channel cannot be read",
    () =>
      Effect.gen(function* resumes() {
        const world = worldWith(attempted());

        const gone = new ChannelUnusable({
          channelId: channelId(1),
          reason: "disabled",
        });

        const { sender, server } = yield* onServer(
          world,
          made,
          Option.some(gone)
        );

        // A first run made no request: nothing went out.
        assert.strictEqual((yield* sender.send(request))._tag, "failed");
        // A resumed one may be out since the run before it.
        assert.deepStrictEqual(yield* sender.resume(request), unknown);
        assert.lengthOf(server.requests(), 0);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "never says a resumed reply did not go out because its comment is gone",
    () =>
      Effect.gen(function* resumes() {
        const world = worldWith(attempted());

        world.state.comments.clear();

        const { sender, server } = yield* onServer(world, made);

        assert.deepStrictEqual(yield* sender.send(request), {
          _tag: "failed",
          reason: "commentGone",
        });
        assert.deepStrictEqual(yield* sender.resume(request), unknown);
        assert.lengthOf(server.requests(), 0);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "never calls Facebook or Instagram where the server does not read them",
    () =>
      Effect.gen(function* off() {
        const world = worldWith(attempted());

        const { sender, server, source } = yield* onServer(
          world,
          made,
          Option.none(),
          { platform: "facebook" }
        );

        assert.deepStrictEqual(yield* sender.send(request), {
          _tag: "failed",
          reason: "channelUnavailable",
        });

        const read = yield* source
          .read({
            channelId: channelId(1),
            threads: [
              {
                platformPostId: PlatformPostIdSchema.make("102000000000001_1"),
                threadId: threadId(1),
              },
            ],
          })
          .pipe(Effect.result);

        assert.isTrue(
          read._tag === "Failure" &&
            read.failure._tag === "ChannelUnreadable" &&
            read.failure.reason === "unsupported"
        );
        assert.lengthOf(server.requests(), 0);
      }).pipe(Effect.scoped)
  );

  it.effect("never calls YouTube where the server does not read it", () =>
    Effect.gen(function* youtubeOff() {
      const world = worldWith(attempted());

      const { sender, server, source } = yield* onServer(
        world,
        made,
        Option.none(),
        { inbox: new Set(["facebook", "instagram"]), platform: "youtube" }
      );

      assert.deepStrictEqual(yield* sender.send(request), {
        _tag: "failed",
        reason: "channelUnavailable",
      });

      const read = yield* source
        .read({
          channelId: channelId(1),
          threads: [
            {
              platformPostId: PlatformPostIdSchema.make("vidSynthetic01"),
              threadId: threadId(1),
            },
          ],
        })
        .pipe(Effect.result);

      assert.isTrue(
        read._tag === "Failure" &&
          read.failure._tag === "ChannelUnreadable" &&
          read.failure.reason === "unsupported"
      );
      assert.lengthOf(server.requests(), 0);
    }).pipe(Effect.scoped)
  );

  it.effect(
    "reads YouTube where the server reads it, with YouTube's bound on keeping it",
    () =>
      Effect.gen(function* youtubeOn() {
        const world = worldWith(attempted());

        const { server, source } = yield* onServer(
          world,
          json({ items: [] }),
          Option.none(),
          { inbox: new Set(["youtube"]), platform: "youtube" }
        );

        const batch = yield* source.read({
          channelId: channelId(1),
          threads: [
            {
              platformPostId: PlatformPostIdSchema.make("vidSynthetic01"),
              threadId: threadId(1),
            },
          ],
        });

        assert.deepStrictEqual(batch.refreshWithin, Duration.days(29));
        assert.lengthOf(server.requests(), 1);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "never calls LinkedIn where the server does not read it, nor for a profile",
    () =>
      Effect.gen(function* linkedinOff() {
        for (const [platform, inbox] of [
          ["linkedinPage", youtubeOnly],
          ["linkedinProfile", linkedinOnly],
        ] as const) {
          const world = worldWith(attempted());

          const { sender, server, source } = yield* onServer(
            world,
            made,
            Option.none(),
            { inbox, platform }
          );

          const read = yield* source
            .read({
              channelId: channelId(1),
              threads: [
                {
                  platformPostId: PlatformPostIdSchema.make(
                    "urn:li:share:7100000000000000001"
                  ),
                  threadId: threadId(1),
                },
              ],
            })
            .pipe(Effect.result);

          assert.isTrue(
            read._tag === "Failure" &&
              read.failure._tag === "ChannelUnreadable" &&
              read.failure.reason === "unsupported"
          );

          if (platform === "linkedinPage") {
            assert.deepStrictEqual(yield* sender.send(request), {
              _tag: "failed",
              reason: "channelUnavailable",
            });
          }

          assert.lengthOf(server.requests(), 0);
        }
      }).pipe(Effect.scoped)
  );

  it.effect(
    "reads a LinkedIn page where the server reads it, with LinkedIn's bound of a day",
    () =>
      Effect.gen(function* linkedinOn() {
        const world = worldWith(attempted());

        const { server, source } = yield* onServer(
          world,
          json({}),
          Option.none(),
          { inbox: linkedinOnly, platform: "linkedinPage" }
        );

        const batch = yield* source.read({
          channelId: channelId(1),
          threads: [
            {
              platformPostId: PlatformPostIdSchema.make(
                "urn:li:share:7100000000000000001"
              ),
              threadId: threadId(1),
            },
          ],
        });

        assert.deepStrictEqual(batch.refreshWithin, Duration.hours(24));
        // The summary, then its list, which confirms it has none.
        assert.lengthOf(server.requests(), 2);
      }).pipe(Effect.scoped)
  );

  it.effect("carries no bound for a platform that sets none", () =>
    Effect.gen(function* mastodon() {
      const world = worldWith(attempted());

      const { source } = yield* onServer(
        world,
        json({ ancestors: [], descendants: [] })
      );

      const batch = yield* source.read({
        channelId: channelId(1),
        threads: [
          {
            platformPostId: PlatformPostIdSchema.make("1001"),
            threadId: threadId(1),
          },
        ],
      });

      assert.isFalse("refreshWithin" in batch);
    }).pipe(Effect.scoped)
  );

  it.effect("sends on Facebook where the server reads it", () =>
    Effect.gen(function* on() {
      const world = worldWith(attempted());

      const { sender, server } = yield* onServer(world, made, Option.none(), {
        inbox: new Set(["facebook"]),
        platform: "facebook",
      });

      assert.strictEqual((yield* sender.send(request))._tag, "sent");
      assert.lengthOf(server.requests(), 1);
    }).pipe(Effect.scoped)
  );
});
