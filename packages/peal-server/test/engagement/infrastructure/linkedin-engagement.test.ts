import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { FetchHttpClient } from "effect/http";

import type { ChannelAccount } from "#channels/application/channel-access.ts";
import type {
  CommentsBatch,
  ThreadToRead,
} from "#engagement/application/ports/comment-source.ts";
import type { OutgoingReply } from "#engagement/infrastructure/platforms/engagement-platform.ts";
import {
  linkedinCommentsDailyCalls,
  linkedinEngagement,
} from "#engagement/infrastructure/platforms/linkedin/linkedin-engagement.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";
import { channelAccessOf } from "#test/analytics/access-log.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";
import {
  fakeLinkedInComments,
  linkedinCommentsVersion,
  linkedinError,
  linkedinPageUrn,
} from "#test/engagement/fakes/fake-linkedin-comments.ts";
import type {
  FakeLinkedInComment,
  FakeLinkedInCommentsOptions,
} from "#test/engagement/fakes/fake-linkedin-comments.ts";
import { memoryQuota } from "#test/engagement/fakes/fake-youtube-comments.ts";
import { replyId, threadId } from "#test/engagement/support.ts";
import { dropped, json } from "#test/publishing/fakes/platform-server.ts";

// A LinkedIn company page's comments against a loopback API that answers
// as LinkedIn's Comments and Social Actions references say: a post's
// summary first, its comments by pages, their nested comments, comments
// made and deleted as the page.

const channelId = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000f5");

const granted = [
  "r_organization_social",
  "rw_organization_admin",
  "w_organization_social",
  "r_organization_social_feed",
  "w_organization_social_feed",
];

const share = "urn:li:share:7100000000000000001";

const activity = "urn:li:activity:7100000000000000009";

const member = "urn:li:person:syntheticMember1";

const thread = (n: number, post = share): ThreadToRead => ({
  platformPostId: PlatformPostIdSchema.make(post),
  threadId: threadId(n),
});

const comment = (
  n: number,
  changed: Partial<FakeLinkedInComment> = {}
): FakeLinkedInComment => ({
  actor: member,
  id: `680000000000000${String(n).padStart(4, "0")}`,
  postUrn: share,
  text: `Comment ${String(n)}`,
  threadUrn: activity,
  time: 1_762_765_200_000 + n * 60_000,
  ...changed,
});

const commentUrn = (n: number) =>
  `urn:li:comment:(${activity},680000000000000${String(n).padStart(4, "0")})`;

const outgoing = (changed: Partial<OutgoingReply> = {}): OutgoingReply => ({
  createdAt: DateTime.makeUnsafe("2025-11-10T09:00:00.000Z"),
  grandparentPlatformId: Option.none(),
  parentPlatformId: commentUrn(1),
  replyId: replyId(1),
  rootPlatformPostId: share,
  takenIds: [],
  text: "Thank you, synthetic member!",
  ...changed,
});

const firstReading = (batch: CommentsBatch) => {
  const [reading] = batch.readings;

  return reading;
};

// The adapter on a fake API, as the page.
const onLinkedIn = Effect.fnUntraced(function* onLinkedIn(
  account: Partial<ChannelAccount> = {},
  fake: FakeLinkedInCommentsOptions & {
    readonly dailyCalls?: { readonly app: number; readonly perPage: number };
  } = {}
) {
  const api = yield* fakeLinkedInComments(["li-token-1"], fake);
  const quota = memoryQuota();

  const page: ChannelAccount = {
    accountId: linkedinPageUrn,
    channelId,
    connection: Option.some("linkedinPage"),
    platform: "linkedin",
    scopes: granted,
    ...account,
  };

  const platform = yield* Effect.gen(function* building() {
    return yield* linkedinEngagement({
      api: new URL(api.url),
      dailyCalls: fake.dailyCalls ?? linkedinCommentsDailyCalls,
      http: yield* publicHttpClient,
      version: linkedinCommentsVersion,
    });
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        channelAccessOf(page, ["li-token-1"]),
        FetchHttpClient.layer,
        OpenOutboundGuard,
        quota.layer
      )
    )
  );

  return { account: page, api, platform, quota };
});

describe("LinkedIn pages' comments", () => {
  it.effect(
    "reads a post without comments from its summary alone, as all of them",
    () =>
      Effect.gen(function* none() {
        const { account, api, platform } = yield* onLinkedIn();

        api.addPost(share, activity);

        assert.deepStrictEqual(
          firstReading(yield* platform.read(account, [thread(1)])),
          { _tag: "read", comments: [], complete: true, threadId: threadId(1) }
        );
        // The comments, which would answer 404, are not asked.
        assert.lengthOf(api.requests(), 1);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "reads comments and their nested comments, by their URNs as LinkedIn gave them",
    () =>
      Effect.gen(function* nested() {
        const { account, api, platform } = yield* onLinkedIn();

        api.addPost(share, activity);
        api.add(comment(1));
        api.add(comment(2));
        api.add(comment(3, { parentUrn: commentUrn(1) }));
        // The page's own answer: the account's, never kept.
        api.add(
          comment(4, { actor: linkedinPageUrn, parentUrn: commentUrn(2) })
        );

        const reading = firstReading(
          yield* platform.read(account, [thread(1)])
        );

        assert.strictEqual(reading?._tag, "read");

        if (reading?._tag !== "read") {
          return;
        }

        assert.isTrue(reading.complete);
        assert.deepStrictEqual(
          reading.comments.map(
            ({ author, fromAccount, parentPlatformId, platformCommentId }) => ({
              author: Option.getOrNull(author),
              fromAccount,
              parent: Option.getOrNull(parentPlatformId),
              platformCommentId,
            })
          ),
          [
            {
              author: {
                displayName: Option.none(),
                handle: "",
                platformId: member,
              },
              fromAccount: false,
              parent: null,
              platformCommentId: commentUrn(1),
            },
            {
              author: {
                displayName: Option.none(),
                handle: "",
                platformId: member,
              },
              fromAccount: false,
              parent: null,
              platformCommentId: commentUrn(2),
            },
            {
              author: {
                displayName: Option.none(),
                handle: "",
                platformId: member,
              },
              fromAccount: false,
              parent: commentUrn(1),
              platformCommentId: commentUrn(3),
            },
            {
              author: {
                displayName: Option.none(),
                handle: "",
                platformId: linkedinPageUrn,
              },
              fromAccount: true,
              parent: commentUrn(2),
              platformCommentId: commentUrn(4),
            },
          ]
        );
        assert.deepStrictEqual(
          reading.comments[0]?.writtenAt,
          DateTime.makeUnsafe(1_762_765_260_000)
        );
        // Every call names the version and Rest.li 2.0.
        assert.isTrue(
          api
            .requests()
            .every(
              ({ headers }) =>
                headers["linkedin-version"] === linkedinCommentsVersion &&
                headers["x-restli-protocol-version"] === "2.0.0"
            )
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "reads every page of a list LinkedIn caps at 10, until its total",
    () =>
      Effect.gen(function* capped() {
        const { account, api, platform } = yield* onLinkedIn(
          {},
          {
            maxCount: 10,
          }
        );

        api.addPost(share, activity);

        for (let n = 1; n <= 35; n += 1) {
          api.add(comment(n));
        }

        const reading = firstReading(
          yield* platform.read(account, [thread(1)])
        );

        assert.strictEqual(reading?._tag, "read");
        assert.strictEqual(
          reading?._tag === "read" ? reading.comments.length : 0,
          35
        );
        assert.isTrue(reading?._tag === "read" && reading.complete);
        // The summary, then four pages.
        assert.lengthOf(api.requests(), 5);
      }).pipe(Effect.scoped)
  );

  it.effect("never takes a list without a total for all of it", () =>
    Effect.gen(function* untotalled() {
      const { account, api, platform } = yield* onLinkedIn(
        {},
        {
          maxCount: 10,
          withoutTotal: true,
        }
      );

      api.addPost(share, activity);

      for (let n = 1; n <= 5; n += 1) {
        api.add(comment(n));
      }

      const reading = firstReading(yield* platform.read(account, [thread(1)]));

      assert.isTrue(reading?._tag === "read" && !reading.complete);
    }).pipe(Effect.scoped)
  );

  it.effect(
    "stops reading, never publishing nor answering, once the day's calls for reads are spent",
    () =>
      Effect.gen(function* budget() {
        const { account, api, platform, quota } = yield* onLinkedIn(
          {},
          {
            dailyCalls: { app: 100, perPage: 3 },
          }
        );

        api.addPost(share, activity);
        api.add(comment(1));

        // Each thread takes a summary and a page: the third read call is
        // the page's last of the day.
        const batch = yield* platform.read(account, [thread(1), thread(2)]);

        assert.isTrue(batch.halted);
        assert.lengthOf(batch.readings, 1);
        assert.lengthOf(api.requests(), 3);
        assert.isTrue([...quota.spent.values()].every((spent) => spent <= 100));

        // A person's reply is not held by the reads' share.
        const sent = yield* platform.send(account, outgoing());

        assert.strictEqual(sent._tag, "sent");

        const later = yield* platform.read(account, [thread(1)]);

        assert.deepStrictEqual(later, { halted: true, readings: [] });
      }).pipe(Effect.scoped)
  );

  it("leaves most of LinkedIn's Development tier to publishing by default", () => {
    assert.isAtMost(linkedinCommentsDailyCalls.perPage, 40);
    assert.isAtMost(linkedinCommentsDailyCalls.app, 250);
  });

  it.effect("reads past a page of comments", () =>
    Effect.gen(function* paged() {
      const { account, api, platform } = yield* onLinkedIn();

      api.addPost(share, activity);

      for (let n = 1; n <= 130; n += 1) {
        api.add(comment(n));
      }

      const reading = firstReading(yield* platform.read(account, [thread(1)]));

      assert.strictEqual(
        reading?._tag === "read" ? reading.comments.length : 0,
        130
      );
    }).pipe(Effect.scoped)
  );

  it.effect(
    "calls nothing for a profile, nor for a page without the scope",
    () =>
      Effect.gen(function* refusedBefore() {
        const profile = yield* onLinkedIn({
          accountId: "syntheticMember1",
          connection: Option.some("linkedinProfile"),
          scopes: ["openid", "profile", "w_member_social"],
        });

        const ended = yield* profile.platform
          .read(profile.account, [thread(1)])
          .pipe(Effect.flip);

        assert.deepStrictEqual(
          ended._tag === "ChannelUnreadable" ? ended.reason : ended._tag,
          "unsupported"
        );
        assert.lengthOf(profile.api.requests(), 0);

        const unscoped = yield* onLinkedIn({ scopes: granted.slice(0, 3) });

        const paused = yield* unscoped.platform
          .read(unscoped.account, [thread(1)])
          .pipe(Effect.flip);

        assert.deepStrictEqual(
          paused._tag === "ChannelUnreadable" ? paused.reason : paused._tag,
          "paused"
        );
        assert.lengthOf(unscoped.api.requests(), 0);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "ends a thread whose post is gone only while the page still reads",
    () =>
      Effect.gen(function* gone() {
        const { account, platform } = yield* onLinkedIn();

        assert.deepStrictEqual(
          firstReading(yield* platform.read(account, [thread(1)])),
          { _tag: "missing", threadId: threadId(1) }
        );

        // A page the token no longer reads: nothing is taken for gone.
        const unreadable = yield* onLinkedIn({
          accountId: "urn:li:organization:9000000099",
        });

        const paused = yield* unreadable.platform
          .read(unreadable.account, [thread(1)])
          .pipe(Effect.flip);

        assert.strictEqual(paused._tag, "ChannelUnreadable");
      }).pipe(Effect.scoped)
  );

  it.effect(
    "pauses on a refused permission on the first thread, and fails only a later one",
    () =>
      Effect.gen(function* permission() {
        const { account, api, platform } = yield* onLinkedIn();

        api.addPost(share, activity);
        api.script("summary", [linkedinError(403)]);

        const paused = yield* platform
          .read(account, [thread(1)])
          .pipe(Effect.flip);

        assert.strictEqual(paused._tag, "ChannelUnreadable");

        api.script("summary", [json({}), linkedinError(403)]);

        const batch = yield* platform.read(account, [thread(1), thread(2)]);

        assert.deepStrictEqual(
          batch.readings.map(({ _tag }) => _tag),
          ["read", "failed"]
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "halts on LinkedIn's limits and a retired version, and waits when it is down",
    () =>
      Effect.gen(function* halts() {
        const { account, api, platform } = yield* onLinkedIn();

        api.addPost(share, activity);
        api.script("summary", [json({}), linkedinError(429)]);

        const limited = yield* platform.read(account, [thread(1), thread(2)]);

        assert.isTrue(limited.halted);
        assert.lengthOf(limited.readings, 1);

        api.script("summary", [linkedinError(426)]);

        assert.deepStrictEqual(yield* platform.read(account, [thread(1)]), {
          halted: true,
          readings: [],
        });

        api.script("summary", [json({ message: "synthetic" }, 503)]);

        const down = yield* platform
          .read(account, [thread(1)])
          .pipe(Effect.flip);

        assert.strictEqual(down._tag, "PlatformUnavailable");
      }).pipe(Effect.scoped)
  );

  it.effect("renews a token LinkedIn refuses", () =>
    Effect.gen(function* renews() {
      const { account, api, platform } = yield* onLinkedIn();

      api.addPost(share, activity);
      api.script("summary", [
        json(
          {
            message: "Invalid access token",
            serviceErrorCode: 65_600,
            status: 401,
          },
          401
        ),
      ]);

      // The fake knows one token: the renewal finds none, and the channel
      // waits to be reconnected.
      const paused = yield* platform
        .read(account, [thread(1)])
        .pipe(Effect.flip);

      assert.strictEqual(paused._tag, "ChannelUnreadable");
    }).pipe(Effect.scoped)
  );
});

describe("LinkedIn pages' replies", () => {
  it.effect(
    "answers as the page under the top-level comment, a nested one's included",
    () =>
      Effect.gen(function* sends() {
        const { account, api, platform } = yield* onLinkedIn();

        api.addPost(share, activity);
        api.add(comment(1));
        api.add(comment(2, { parentUrn: commentUrn(1) }));

        const toTop = yield* platform.send(account, outgoing());

        const toNested = yield* platform.send(
          account,
          outgoing({
            grandparentPlatformId: Option.some(commentUrn(1)),
            parentPlatformId: commentUrn(2),
          })
        );

        const made = api
          .comments()
          .filter(({ actor }) => actor === linkedinPageUrn);

        assert.lengthOf(made, 2);
        assert.isTrue(
          made.every(({ parentUrn }) => parentUrn === commentUrn(1))
        );
        assert.deepStrictEqual(
          [toTop, toNested].map((outcome) =>
            outcome._tag === "sent" ? outcome.platformCommentId : outcome._tag
          ),
          made.map(api.urnOf)
        );
      }).pipe(Effect.scoped)
  );

  it.effect("says a reply whose answer never came may be out", () =>
    Effect.gen(function* lost() {
      const { account, api, platform } = yield* onLinkedIn();

      api.addPost(share, activity);
      api.add(comment(1));
      api.lose();

      assert.deepStrictEqual(yield* platform.send(account, outgoing()), {
        _tag: "unconfirmed",
        reason: "noResponse",
      });

      // Found once among the comments under it: sent, and never again.
      const resumed = yield* platform.resume(account, outgoing());

      assert.strictEqual(resumed._tag, "sent");
      assert.lengthOf(
        api.requests().filter(({ method }) => method === "POST"),
        1
      );
    }).pipe(Effect.scoped)
  );

  it.effect("fails a reply LinkedIn refuses, which nothing made", () =>
    Effect.gen(function* refused() {
      const { account, api, platform } = yield* onLinkedIn();

      api.addPost(share, activity);
      api.add(comment(1));
      api.script("create", [
        linkedinError(429, "Comment create throttled"),
        linkedinError(422),
      ]);

      assert.deepStrictEqual(yield* platform.send(account, outgoing()), {
        _tag: "failed",
        reason: "rateLimited",
      });
      assert.deepStrictEqual(yield* platform.send(account, outgoing()), {
        _tag: "failed",
        reason: "refused",
      });

      api.script("create", [dropped]);

      assert.deepStrictEqual(yield* platform.send(account, outgoing()), {
        _tag: "unconfirmed",
        reason: "noResponse",
      });
    }).pipe(Effect.scoped)
  );

  it.effect("leaves a resumed reply to a person when none is found", () =>
    Effect.gen(function* undecided() {
      const { account, api, platform } = yield* onLinkedIn();

      api.addPost(share, activity);
      api.add(comment(1));

      assert.deepStrictEqual(yield* platform.resume(account, outgoing()), {
        _tag: "unconfirmed",
        reason: "interrupted",
      });
    }).pipe(Effect.scoped)
  );

  it.effect("withdraws the page's own comment, one already gone included", () =>
    Effect.gen(function* withdraws() {
      const { account, api, platform } = yield* onLinkedIn();

      api.addPost(share, activity);
      api.add(comment(1));
      api.add(comment(9, { actor: linkedinPageUrn, parentUrn: commentUrn(1) }));

      assert.deepStrictEqual(
        yield* platform.withdraw(account, commentUrn(9), share),
        { _tag: "done" }
      );
      assert.lengthOf(api.comments(), 1);
      assert.deepStrictEqual(
        yield* platform.withdraw(account, commentUrn(9), share),
        { _tag: "done" }
      );
      // A member's comment is not the page's to delete.
      assert.deepStrictEqual(
        yield* platform.withdraw(account, commentUrn(1), share),
        { _tag: "failed", reason: "refused" }
      );
    }).pipe(Effect.scoped)
  );

  it.effect("hides and likes nothing", () =>
    Effect.gen(function* moderates() {
      const { account, api, platform } = yield* onLinkedIn();

      assert.deepStrictEqual(
        yield* platform.moderate(account, {
          action: "hide",
          platformCommentId: commentUrn(1),
          receivedAt: DateTime.makeUnsafe("2025-11-10T09:00:00.000Z"),
          rootPlatformPostId: share,
        }),
        { _tag: "failed", reason: "refused" }
      );
      assert.lengthOf(api.requests(), 0);
    }).pipe(Effect.scoped)
  );
});
