import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import type { Scope } from "effect";

import { ApprovalGate } from "#publishing/application/approval-gate.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostEvents } from "#publishing/application/post-events.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { ShortLinkDefaults } from "#publishing/application/short-link-defaults.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import {
  scheduleIn,
  setTime,
  utc,
} from "#test/publishing/infrastructure/harness.ts";
import type { PostsServerTest } from "#test/publishing/posts-server.ts";
import { connect, postsServerBehind } from "#test/publishing/posts-server.ts";
import {
  actorIn,
  attachableMedia,
  contentOf,
  postAllowance,
} from "#test/publishing/support.ts";

// The workspace's default for short links, which a new post that does not
// say takes when it is made, whoever makes it; one that says keeps its own
// choice.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const paris = TimeZoneIdSchema.make("Europe/Paris");

const freshWorkspace = newId(WorkspaceIdSchema);

// The workspaces whose default is on, which a test adds to.
const shortening = new Set<WorkspaceId>();

const ShorteningServer = postsServerBehind(
  ApprovalGate.open,
  attachableMedia(),
  postAllowance(),
  PostEvents.none,
  undefined,
  undefined,
  Layer.succeed(
    ShortLinkDefaults,
    ShortLinkDefaults.of({
      byDefault: (workspaceId) => Effect.succeed(shortening.has(workspaceId)),
    })
  )
);

type Server = Layer.Success<typeof PostsServerTest>;

const onServer = <A, E>(
  test: Effect.Effect<A, E, Server | Scope.Scope>,
  server: typeof ShorteningServer = ShorteningServer
) => setTime(start).pipe(Effect.andThen(test.pipe(Effect.provide(server))));

// A workspace whose default is on, with a channel.
const shorteningWorkspace = Effect.gen(function* shorteningWorkspace() {
  const workspaceId = yield* freshWorkspace;

  shortening.add(workspaceId);

  return { channel: yield* connect(workspaceId, "mastodon"), workspaceId };
});

describe("the workspace's short links default", () => {
  it.effect(
    "is taken by a new draft that does not say, never by one that does",
    () =>
      onServer(
        Effect.gen(function* drafts() {
          const { channel, workspaceId } = yield* shorteningWorkspace;
          const posts = yield* PostDrafts;
          const actor = actorIn(workspaceId);

          const unsaid = yield* posts.create(actor, {
            channelIds: [channel],
            content: contentOf("A synthetic draft https://example.com/a"),
          });

          assert.isTrue(unsaid.post.shortenLinks);

          const refused = yield* posts.create(actor, {
            channelIds: [channel],
            content: contentOf("A synthetic draft https://example.com/b"),
            shortenLinks: false,
          });

          assert.isFalse(refused.post.shortenLinks);

          // Changed without saying, a draft keeps its own choice.
          const edited = yield* posts.update(actor, refused.post.id, {
            channelIds: [channel],
            content: contentOf("A synthetic draft https://example.com/c"),
          });

          assert.isFalse(edited.post.shortenLinks);
        })
      ),
    timeout
  );

  it.effect(
    "is taken by a post scheduled or sent that does not say",
    () =>
      onServer(
        Effect.gen(function* scheduled() {
          const { channel, workspaceId } = yield* shorteningWorkspace;
          const scheduling = yield* PostScheduling;
          const actor = actorIn(workspaceId);

          const later = yield* scheduling.schedule(actor, {
            channelIds: [channel],
            content: contentOf("A synthetic post https://example.com/d"),
            schedule: scheduleIn("2026-06-16T07:00:00Z"),
          });

          assert.isTrue(later.post.shortenLinks);

          const sent = yield* scheduling.send(actor, {
            channelIds: [channel],
            content: contentOf("A synthetic post https://example.com/e"),
            idempotency: Option.none(),
            placement: { _tag: "at", at: utc("2026-06-17T07:00:00Z") },
            timeZone: paris,
          });

          assert.isTrue(sent.post.shortenLinks);

          const refused = yield* scheduling.send(actor, {
            channelIds: [channel],
            content: contentOf("A synthetic post https://example.com/f"),
            idempotency: Option.none(),
            placement: { _tag: "at", at: utc("2026-06-18T07:00:00Z") },
            shortenLinks: false,
            timeZone: paris,
          });

          assert.isFalse(refused.post.shortenLinks);

          for (const { post } of [later, sent, refused]) {
            yield* scheduling.cancel(actor, post.id);
          }
        })
      ),
    timeout
  );

  it.effect(
    "leaves a workspace without one as it was: no short links unless asked",
    () =>
      onServer(
        Effect.gen(function* withoutDefault() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const posts = yield* PostDrafts;

          const draft = yield* posts.create(actorIn(workspaceId), {
            channelIds: [channel],
            content: contentOf("A synthetic draft https://example.com/g"),
          });

          assert.isFalse(draft.post.shortenLinks);

          const asked = yield* posts.create(actorIn(workspaceId), {
            channelIds: [channel],
            content: contentOf("A synthetic draft https://example.com/h"),
            shortenLinks: true,
          });

          assert.isTrue(asked.post.shortenLinks);
        })
      ),
    timeout
  );
});
