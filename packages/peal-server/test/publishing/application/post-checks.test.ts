import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { PostAllowance } from "#publishing/application/post-allowance.ts";
import { isSendable, PostChecks } from "#publishing/application/post-checks.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PinterestOptions } from "#publishing/domain/pinterest-options.ts";
import { newId } from "#shared/application/ids.ts";
import {
  ChannelIdSchema,
  MediaAssetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { setTime, utc } from "#test/publishing/infrastructure/harness.ts";
import {
  attachableImage,
  attachableVideo,
  connect,
  onPostsServerAt,
  postsServerWith,
} from "#test/publishing/posts-server.ts";
import {
  actorIn,
  attachableMedia,
  contentOf,
} from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// Checking a post without making it: everything that would refuse it, at
// once, and what each channel would receive.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const paris = TimeZoneIdSchema.make("Europe/Paris");

const freshWorkspace = newId(WorkspaceIdSchema);

const rowsIn = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<{
        count: number;
      }>`SELECT count(*)::int AS count FROM publishing.posts WHERE workspace_id = ${workspaceId}`
  ).pipe(Effect.map((rows) => rows[0]?.count ?? 0));

const now = Option.some({ at: Option.none() });

describe("PostChecks.check", () => {
  it.effect(
    "answers what each channel receives, counted as its platform counts",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* previews() {
          const checks = yield* PostChecks;
          const workspaceId = yield* freshWorkspace;
          const bluesky = yield* connect(workspaceId, "bluesky");
          const x = yield* connect(workspaceId, "x");

          const check = yield* checks.check(actorIn(workspaceId), {
            channelIds: [bluesky, x],
            content: contentOf("Hello #launch from https://peal.social", {
              overrides: [[x, "Short, for X: https://peal.social/a/long/path"]],
            }),
            when: now,
          });

          assert.isTrue(isSendable(check));
          assert.deepStrictEqual(check.schedule, Option.some("ok" as const));
          assert.isTrue(Option.isNone(check.planLimit));

          const [onBluesky, onX] = check.channels;

          assert.strictEqual(
            onBluesky?.text,
            "Hello #launch from https://peal.social"
          );
          assert.strictEqual(onBluesky?.channel.platform, "bluesky");
          assert.deepStrictEqual(onBluesky?.hashtags, {
            count: 1,
            maximum: undefined,
          });
          assert.strictEqual(onBluesky?.links.count, 1);
          // Bluesky limits graphemes, and bytes too.
          assert.deepStrictEqual(
            onBluesky?.textCounts.map(({ unit }) => unit),
            ["graphemes", "utf8Bytes"]
          );
          assert.strictEqual(onBluesky?.textCounts[0]?.length, 38);

          // X receives its own text, and counts a link as 23.
          assert.strictEqual(
            onX?.text,
            "Short, for X: https://peal.social/a/long/path"
          );
          assert.deepStrictEqual(onX?.textCounts, [
            { length: 14 + 23, maximum: 280, unit: "weighted" },
          ]);

          // Nothing was made.
          assert.strictEqual(yield* rowsIn(workspaceId), 0);
        })
      ),
    timeout
  );

  it.effect(
    "answers every refusal at once, by channel",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* refusals() {
          const checks = yield* PostChecks;
          const workspaceId = yield* freshWorkspace;
          const elsewhere = yield* freshWorkspace;
          const bluesky = yield* connect(workspaceId, "bluesky");
          const youtube = yield* connect(workspaceId, "youtube");
          const theirs = yield* connect(elsewhere, "mastodon");

          const missing = ChannelIdSchema.make(
            "00000000-0000-7000-8000-00000000c0de"
          );

          const noMedia = MediaAssetIdSchema.make(
            "00000000-0000-7000-8000-00000000dead"
          );

          const check = yield* checks.check(actorIn(workspaceId), {
            channelIds: [bluesky, youtube, theirs, missing],
            content: contentOf("a".repeat(301), {
              media: [attachableImage, noMedia],
            }),
            // A day ago.
            when: Option.some({ at: Option.some(utc("2026-06-14T07:00:00Z")) }),
          });

          assert.isFalse(isSendable(check));
          assert.deepStrictEqual(check.unknownChannels, [theirs, missing]);
          assert.deepStrictEqual(check.unknownMedia, [noMedia]);
          assert.deepStrictEqual(
            check.schedule,
            Option.some("inPast" as const)
          );
          // What is said of the channels it is not for is said once.
          assert.deepStrictEqual(check.violations, []);

          const [onBluesky, onYouTube] = check.channels;

          assert.lengthOf(check.channels, 2);
          assert.deepStrictEqual(
            onBluesky?.violations.map(({ _tag }) => _tag),
            ["textTooLong"]
          );
          // YouTube takes a video, and needs a title.
          assert.includeMembers(
            (onYouTube?.violations ?? []).map(({ _tag }) => _tag),
            ["mediaTypeUnsupported", "optionMissing"]
          );

          // A platform that came since is checked as scheduling checks it:
          // a Pin needs an image or a video, and the board it is saved to.
          const pinterest = yield* connect(workspaceId, "pinterest");

          const pin = yield* checks.check(actorIn(workspaceId), {
            channelIds: [pinterest],
            content: contentOf("A synthetic Pin."),
            options: [
              {
                channelId: pinterest,
                options: new PinterestOptions({ platform: "pinterest" }),
              },
            ],
            when: Option.none(),
          });

          assert.includeMembers(
            (pin.channels[0]?.violations ?? []).map(({ _tag }) => _tag),
            ["optionMissing"]
          );
          assert.strictEqual(pin.channels[0]?.media.maximum, 5);

          // No channel at all, and a text for a channel it is not for.
          const empty = yield* checks.check(actorIn(workspaceId), {
            channelIds: [],
            content: contentOf("Words", { overrides: [[bluesky, "Others"]] }),
            when: Option.none(),
          });

          assert.isFalse(isSendable(empty));
          assert.deepStrictEqual(
            empty.violations.map(({ _tag }) => _tag),
            ["noChannels", "overrideWithoutChannel"]
          );
          // A draft has no time to check.
          assert.isTrue(Option.isNone(empty.schedule));

          // The same post goes through scheduling's own checks the same.
          const video = yield* checks.check(actorIn(workspaceId), {
            channelIds: [bluesky],
            content: contentOf("With a video", { media: [attachableVideo] }),
            when: now,
          });

          assert.isTrue(isSendable(video));

          const sent = yield* PostScheduling.use((scheduling) =>
            scheduling.send(actorIn(workspaceId), {
              at: Option.none(),
              channelIds: [bluesky],
              content: contentOf("With a video", { media: [attachableVideo] }),
              idempotency: Option.none(),
              timeZone: paris,
            })
          );

          assert.strictEqual(sent.post.status._tag, "scheduled");

          // Reading posts is enough to check one.
          const viewer = yield* checks.check(
            actorIn(workspaceId, permissionsFor("viewer")),
            { channelIds: [bluesky], content: contentOf("Words"), when: now }
          );

          assert.isTrue(isSendable(viewer));

          const denied = yield* checks
            .check(actorIn(workspaceId, []), {
              channelIds: [bluesky],
              content: contentOf("Words"),
              when: now,
            })
            .pipe(Effect.flip);

          assert.strictEqual(denied._tag, "MissingPermission");
        })
      ),
    timeout
  );

  const OnePostServer = postsServerWith(
    attachableMedia(),
    Layer.succeed(
      PostAllowance,
      PostAllowance.of({
        channels: () =>
          Effect.succeed({ allowed: Option.none(), connected: 0 }),
        members: () => Effect.succeed({ allowed: Option.none(), taken: 1 }),
        scheduledPerMonth: () => Effect.succeed(Option.some(1)),
      })
    )
  );

  it.effect(
    "says when the plan's month has no room, in the month asked",
    () =>
      Effect.gen(function* planRoom() {
        const checks = yield* PostChecks;
        const workspaceId = yield* freshWorkspace;
        const channel = yield* connect(workspaceId, "mastodon");
        const actor = actorIn(workspaceId);

        const request = (at: string) => ({
          channelIds: [channel],
          content: contentOf("A synthetic post."),
          when: Option.some({ at: Option.some(utc(at)) }),
        });

        const before = yield* checks.check(
          actor,
          request("2026-06-20T08:00:00Z")
        );

        assert.isTrue(isSendable(before));

        yield* PostScheduling.use((scheduling) =>
          scheduling.send(actor, {
            at: Option.some(utc("2026-06-20T08:00:00Z")),
            channelIds: [channel],
            content: contentOf("A synthetic post."),
            idempotency: Option.none(),
            timeZone: paris,
          })
        );

        const june = yield* checks.check(
          actor,
          request("2026-06-21T08:00:00Z")
        );

        assert.isFalse(isSendable(june));
        assert.deepStrictEqual(
          june.planLimit.pipe(
            Option.map(({ allowed, limit, used }) => ({ allowed, limit, used }))
          ),
          Option.some({ allowed: 1, limit: "scheduledPosts" as const, used: 1 })
        );

        // July is another month.
        const july = yield* checks.check(
          actor,
          request("2026-07-01T08:00:00Z")
        );

        assert.isTrue(isSendable(july));

        // A draft takes no room: without a time, the plan is not asked.
        const draft = yield* checks.check(actor, {
          ...request("2026-06-21T08:00:00Z"),
          when: Option.none(),
        });

        assert.isTrue(Option.isNone(draft.planLimit));
      }).pipe(Effect.provide(OnePostServer), (test) =>
        setTime(start).pipe(Effect.andThen(test))
      ),
    timeout
  );
});
