import { assert, describe, it } from "@effect/vitest";
import { Effect, Option } from "effect";

import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostRecords } from "#publishing/application/post-records.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { PostAttribution } from "#publishing/domain/post-origin.ts";
import type { PostOrigin } from "#publishing/domain/post-origin.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import { TextOverride } from "#publishing/domain/text-override.ts";
import { newId } from "#shared/application/ids.ts";
import { Actor } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";
import {
  callsOn,
  eventually,
  isFinished,
  isSuspended,
  scheduleIn,
  setTime,
  storedPost,
} from "#test/publishing/infrastructure/harness.ts";
import { connect, onPostsServerAt } from "#test/publishing/posts-server.ts";
import { actorAs, apiKeyIn, contentOf } from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// A post keeps how it was created and scheduled: in the web app, with an
// API key, or through an OAuth application acting for a member.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const freshWorkspace = newId(WorkspaceIdSchema);

// Random, as tests share the database.
const freshUser = Effect.sync(() => UserIdSchema.make(crypto.randomUUID()));

const web: PostOrigin = { _tag: "web" };

const application: PostOrigin = {
  _tag: "application",
  clientId: "synthetic-client",
};

const attributed = (
  createdVia: PostOrigin,
  scheduled?: { readonly by?: UserId; readonly via: PostOrigin }
) =>
  new PostAttribution({
    createdVia: Option.some(createdVia),
    scheduledBy: Option.fromUndefinedOr(scheduled?.by),
    scheduledVia: Option.fromUndefinedOr(scheduled?.via),
  });

describe("a post's attribution", () => {
  it.effect(
    "keeps how the post was created, and who scheduled it and how",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* attributes() {
          const drafts = yield* PostDrafts;
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const ana = yield* freshUser;
          const channel = yield* connect(workspaceId, "mastodon");

          // An agent writes the draft for Ana, through an OAuth client.
          const agent = new Actor({
            permissions: permissionsFor("editor"),
            subject: {
              _tag: "user",
              clientId: "synthetic-client",
              impersonatedBy: Option.none(),
              userId: ana,
            },
            workspaceId,
          });

          const draft = yield* drafts.create(agent, {
            channelIds: [channel],
            content: contentOf("A synthetic post an agent drafted."),
          });

          assert.deepStrictEqual(
            (yield* storedPost(draft.post.id)).post.attribution,
            attributed(application)
          );

          // Ana schedules it herself, in the web app.
          const scheduled = yield* scheduling.scheduleDraft(
            actorAs(ana, workspaceId),
            draft.post.id,
            {
              channelIds: [channel],
              schedule: scheduleIn("2026-06-15T09:00:00Z"),
            }
          );

          assert.deepStrictEqual(
            scheduled.post.attribution,
            attributed(application, { by: ana, via: web })
          );

          // An API key moves it: the key, and no member, scheduled it.
          yield* scheduling.reschedule(
            apiKeyIn(workspaceId),
            draft.post.id,
            scheduleIn("2026-06-15T10:00:00Z")
          );

          assert.deepStrictEqual(
            (yield* storedPost(draft.post.id)).post.attribution,
            attributed(application, {
              via: { _tag: "apiKey", apiKeyId: "synthetic-key" },
            })
          );

          // Back to draft, nobody scheduled it.
          const back = yield* scheduling.unschedule(
            actorAs(ana, workspaceId),
            draft.post.id
          );

          assert.deepStrictEqual(
            back.post.attribution,
            attributed(application)
          );
        })
      ),
    timeout
  );

  it.effect(
    "exports every part of a post, and how many are live on each channel",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* exportsParts() {
          const scheduling = yield* PostScheduling;
          const records = yield* PostRecords;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");

          const { post } = yield* scheduling.schedule(
            actorAs(yield* freshUser, workspaceId),
            {
              channelIds: [channel],
              content: new PostContent({
                followUps: [
                  new PostPart({
                    delaySeconds: 0,
                    media: [],
                    overrides: [
                      new TextOverride({
                        channelId: channel,
                        text: "A synthetic second part, here.",
                      }),
                    ],
                    text: "A synthetic second part.",
                  }),
                ],
                media: [],
                overrides: [],
                text: "A synthetic first part.",
              }),
              schedule: scheduleIn("2026-06-15T08:00:00Z"),
            }
          );

          yield* eventually("the job is parked", isSuspended(post.id));
          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually("the post finished", isFinished(post.id));

          const [exported] = yield* records.exportWorkspace(workspaceId);

          assert(exported !== undefined);
          assert.deepStrictEqual(exported.followUps, [
            {
              delaySeconds: 0,
              media: [],
              text: "A synthetic second part.",
              textOverrides: [
                { channelId: channel, text: "A synthetic second part, here." },
              ],
            },
          ]);
          assert.deepStrictEqual(
            exported.targets.map(({ partsLive }) => partsLive),
            [2]
          );
        })
      ),
    timeout
  );

  it.effect(
    "never reaches the platform, stays in the export without who, and forgets who scheduled",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* keepsToItself() {
          const scheduling = yield* PostScheduling;
          const records = yield* PostRecords;
          const workspaceId = yield* freshWorkspace;
          const ana = yield* freshUser;
          const channel = yield* connect(workspaceId, "mastodon");

          const { post } = yield* scheduling.schedule(
            actorAs(ana, workspaceId),
            {
              channelIds: [channel],
              content: contentOf("A synthetic post Ana scheduled."),
              schedule: scheduleIn("2026-06-15T08:00:00Z"),
            }
          );

          yield* eventually("the job is parked", isSuspended(post.id));
          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually("the post finished", isFinished(post.id));

          // What the platform was handed says nothing of how it was made.
          const calls = yield* callsOn(channel);

          assert.lengthOf(calls, 1);
          assert.notInclude(JSON.stringify(calls), ana);
          assert.notInclude(JSON.stringify(calls), "web");

          const [exported] = yield* records.exportWorkspace(workspaceId);

          assert.deepStrictEqual(exported?.createdVia, {
            name: null,
            via: "web",
          });
          assert.deepStrictEqual(exported?.scheduledVia, {
            name: null,
            via: "web",
          });
          assert.notInclude(JSON.stringify(exported), ana);

          yield* records.forgetAuthor(ana);

          const forgotten = yield* storedPost(post.id);

          assert.isTrue(Option.isNone(forgotten.post.authorId));
          assert.deepStrictEqual(
            forgotten.post.attribution,
            attributed(web, { via: web })
          );
        })
      ),
    timeout
  );
});
