import { assert, describe, it } from "@effect/vitest";
import { Duration, Effect, Option } from "effect";
import { SqlClient } from "effect/sql";

import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { ChannelOptions } from "#publishing/domain/channel-options.ts";
import { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import { TextOverride } from "#publishing/domain/text-override.ts";
import { YouTubeOptions } from "#publishing/domain/youtube-options.ts";
import { CommentRejected } from "#review/application/comment-rejected.ts";
import { LinkAccessDenied } from "#review/application/link-access-denied.ts";
import { LinkClosed } from "#review/application/link-closed.ts";
import { LinkNotFound } from "#review/application/link-not-found.ts";
import { PostNotReviewable } from "#review/application/post-not-reviewable.ts";
import { PostReview } from "#review/application/post-review.ts";
import { PurgeReviewData } from "#review/application/purge-review-data.ts";
import type { CommentDraft } from "#review/application/review-desk.ts";
import { ReviewLinks } from "#review/application/review-links.ts";
import { ReviewPostNotFound } from "#review/application/review-post-not-found.ts";
import { VisitorReview } from "#review/application/visitor-review.ts";
import { ApprovalChanged } from "#review/domain/approval-changed.ts";
import { locate } from "#review/domain/comment-anchor.ts";
import type { LinkAccess } from "#review/domain/review-link.ts";
import { newId } from "#shared/application/ids.ts";
import type { Actor } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";
import {
  eventually,
  isFinished,
  isSuspended,
  scheduleIn,
  setTime,
  storedPost,
} from "#test/publishing/infrastructure/harness.ts";
import { attachableImage, connect } from "#test/publishing/posts-server.ts";
import { actorAs, contentOf } from "#test/publishing/support.ts";
import {
  impersonating,
  onReviewServerAt,
  shown,
  Told,
  visitor,
  withPolicy,
} from "#test/review/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// Review links and comments, over Postgres: what a link shows and lets its
// holders do, when it stops working, and how threads behave.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const at8 = scheduleIn("2026-06-15T08:00:00Z");

const freshWorkspace = newId(WorkspaceIdSchema);

const freshUser = newId(WorkspaceIdSchema).pipe(
  Effect.map((id) => UserIdSchema.make(id))
);

const text = "Launch day is here. Join us on Friday.";

const say = (
  words: string,
  more: Partial<Omit<CommentDraft, "text">> = {}
): CommentDraft => ({
  anchor: Option.none(),
  parentId: Option.none(),
  text: words,
  ...more,
});

// A workspace with a channel, an editor, and a draft on the channel.
const drafted = Effect.gen(function* drafted() {
  const workspaceId: WorkspaceId = yield* freshWorkspace;
  const channelId: ChannelId = yield* connect(workspaceId, "mastodon");
  const editor: Actor = actorAs(yield* freshUser, workspaceId);

  const { post } = yield* PostDrafts.use((drafts) =>
    drafts.create(editor, {
      channelIds: [channelId],
      content: contentOf(text, {
        overrides: [[channelId, `${text} #launch`]],
      }),
    })
  );

  return { channelId, editor, postId: post.id, workspaceId };
});

const linkTo = (
  actor: Actor,
  postId: PostId,
  access: LinkAccess,
  lifetime: Option.Option<Duration.Duration> = Option.none()
) =>
  ReviewLinks.use((links) => links.create(actor, postId, { access, lifetime }));

describe("a review link", () => {
  it.effect(
    "shows the post as each channel will receive it, and nothing it was not asked",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* shows() {
          const visitors = yield* VisitorReview;
          const { channelId, editor, postId } = yield* drafted;
          const { link, token } = yield* linkTo(editor, postId, "view");

          assert.match(token, /^[\w-]{43}$/u);
          assert.deepStrictEqual(
            link.expiresAt.pipe((at) => at.epochMilliseconds),
            Date.parse("2026-06-29T07:00:00Z")
          );

          const page = yield* visitors.open(token);

          assert.deepStrictEqual(page.post.channels, [
            {
              channelId,
              followUps: [],
              handle: page.post.channels[0]?.handle ?? Option.none(),
              media: Option.none(),
              options: Option.none(),
              platform: Option.some("mastodon" as const),
              text: `${text} #launch`,
            },
          ]);
          assert.isTrue(
            Option.isSome(page.post.channels[0]?.handle ?? Option.none())
          );
          assert.strictEqual(page.post.status, "draft");
          assert.deepStrictEqual(page.comments, []);

          // A token nobody was given opens nothing.
          assert.deepStrictEqual(
            yield* Effect.flip(visitors.open(`${token.slice(0, -1)}_`)),
            new LinkNotFound()
          );
        })
      ),
    timeout
  );

  it.effect(
    "is made by those who may approve, in person, for a post still to go out",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* whoMakes() {
          const links = yield* ReviewLinks;
          const scheduling = yield* PostScheduling;
          const { editor, postId, workspaceId } = yield* drafted;

          const refused = [
            actorAs(
              yield* freshUser,
              workspaceId,
              permissionsFor("contributor")
            ),
            impersonating(yield* freshUser, yield* freshUser, workspaceId),
          ];

          for (const actor of refused) {
            assert.deepStrictEqual(
              yield* Effect.flip(linkTo(actor, postId, "view")),
              new MissingPermission({ permission: "post:approve" })
            );
          }

          // Another workspace's editor finds no such post.
          const outsider = actorAs(yield* freshUser, yield* freshWorkspace);

          assert.deepStrictEqual(
            yield* Effect.flip(linkTo(outsider, postId, "view")),
            new ReviewPostNotFound({ postId })
          );

          yield* scheduling.cancel(editor, postId);

          assert.deepStrictEqual(
            yield* Effect.flip(linkTo(editor, postId, "view")),
            new PostNotReviewable({ postId, status: "cancelled" })
          );
          assert.deepStrictEqual(yield* links.ofPost(editor, postId), []);
        })
      ),
    timeout
  );

  it.effect(
    "stops working once revoked, expired, or its post went out or was deleted, and says which",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* closes() {
          const links = yield* ReviewLinks;
          const visitors = yield* VisitorReview;
          const scheduling = yield* PostScheduling;
          const drafts = yield* PostDrafts;
          const { channelId, editor, postId } = yield* drafted;

          const reasonOf = (token: string) =>
            Effect.flip(visitors.open(token)).pipe(
              Effect.map((closed) =>
                closed instanceof LinkClosed ? closed.reason : closed._tag
              )
            );

          const revoked = yield* linkTo(editor, postId, "view");

          const short = yield* linkTo(
            editor,
            postId,
            "view",
            Option.some(Duration.hours(1))
          );

          const long = yield* linkTo(editor, postId, "comment");

          yield* links.revoke(editor, revoked.link.id);

          assert.strictEqual(yield* reasonOf(revoked.token), "revoked");

          // The post goes out at 08:00, as the short link expires.
          yield* scheduling.scheduleDraft(editor, postId, {
            channelIds: [channelId],
            schedule: at8,
          });
          yield* eventually("the job sleeps", isSuspended(postId));
          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually("the post finishes", isFinished(postId));

          assert.strictEqual(yield* reasonOf(short.token), "expired");
          assert.strictEqual(yield* reasonOf(long.token), "published");
          assert.deepStrictEqual(
            yield* Effect.flip(
              visitors.comment(long.token, visitor(), say("Too late?"))
            ),
            new LinkClosed({ reason: "published" })
          );

          // A draft that is discarded takes its review with it; its link
          // says the post is gone.
          const other = yield* drafts.create(editor, {
            channelIds: [channelId],
            content: contentOf("A synthetic draft to discard."),
          });

          const gone = yield* linkTo(editor, other.post.id, "comment");

          yield* visitors.comment(gone.token, visitor(), say("A comment."));
          yield* drafts.discard(editor, other.post.id);

          assert.strictEqual(yield* reasonOf(gone.token), "deleted");
        })
      ),
    timeout
  );

  it.effect(
    "lets its holders do what it allows, and no more",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* allows() {
          const visitors = yield* VisitorReview;
          const scheduling = yield* PostScheduling;
          const review = yield* PostReview;
          const { channelId, editor, postId, workspaceId } = yield* drafted;

          yield* withPolicy(workspaceId, "always");
          yield* scheduling.scheduleDraft(editor, postId, {
            channelIds: [channelId],
            schedule: at8,
          });

          const waiting = { id: postId, workspaceId };
          const view = yield* linkTo(editor, postId, "view");
          const comment = yield* linkTo(editor, postId, "comment");
          const approve = yield* linkTo(editor, postId, "approve");

          assert.deepStrictEqual(
            yield* Effect.flip(
              visitors.comment(view.token, visitor(), say("May I?"))
            ),
            new LinkAccessDenied({ needed: "comment" })
          );
          assert.deepStrictEqual(
            yield* Effect.flip(
              visitors.approve(comment.token, visitor(), yield* shown(waiting))
            ),
            new LinkAccessDenied({ needed: "approve" })
          );

          // Approved through the link: recorded with the name given, the
          // time and the link.
          assert.deepStrictEqual(
            yield* visitors.approve(
              approve.token,
              visitor("  Ada\n Lovelace "),
              yield* shown(waiting)
            ),
            { late: false }
          );
          assert.strictEqual(
            (yield* storedPost(postId)).post.status._tag,
            "scheduled"
          );

          const [request] = (yield* review.thread(editor, postId)).requests;

          assert.deepStrictEqual(
            request?.decision.pipe(Option.map(({ by }) => by)),
            Option.some({
              _tag: "visitor" as const,
              linkId: approve.link.id,
              name: Option.some("Ada Lovelace"),
            })
          );
          assert.deepStrictEqual(
            request?.decision.pipe(
              Option.map(({ at }) => at.epochMilliseconds)
            ),
            Option.some(Date.parse(start))
          );
        })
      ),
    timeout
  );

  it.effect(
    "shows the options the post has on a channel, which an approval covers",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* showsOptions() {
          const visitors = yield* VisitorReview;
          const review = yield* PostReview;
          const workspaceId: WorkspaceId = yield* freshWorkspace;
          const channelId: ChannelId = yield* connect(workspaceId, "youtube");
          const editor: Actor = actorAs(yield* freshUser, workspaceId);

          const options = new YouTubeOptions({
            madeForKids: false,
            platform: "youtube",
            privacy: "public",
            title: "A synthetic launch video",
          });

          const { post } = yield* PostDrafts.use((drafts) =>
            drafts.create(editor, {
              channelIds: [channelId],
              content: contentOf(text),
              options: [new ChannelOptions({ channelId, options })],
            })
          );

          const { token } = yield* linkTo(editor, post.id, "view");

          const expected = [
            Option.some({
              madeForKids: false,
              platform: "youtube",
              privacy: "public",
              title: "A synthetic launch video",
            }),
          ];

          assert.deepStrictEqual(
            (yield* visitors.open(token)).post.channels.map(
              (channel) => channel.options
            ),
            expected
          );
          assert.deepStrictEqual(
            (yield* review.thread(editor, post.id)).post.channels.map(
              (channel) => channel.options
            ),
            expected
          );
        })
      ),
    timeout
  );

  it.effect(
    "shows every part of a post, as each channel will receive it",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* showsParts() {
          const visitors = yield* VisitorReview;
          const workspaceId = yield* freshWorkspace;
          const channelId = yield* connect(workspaceId, "mastodon");
          const editor = actorAs(yield* freshUser, workspaceId);

          const { post } = yield* PostDrafts.use((drafts) =>
            drafts.create(editor, {
              channelIds: [channelId],
              content: new PostContent({
                followUps: [
                  new PostPart({
                    delaySeconds: 0,
                    media: [],
                    overrides: [
                      new TextOverride({ channelId, text: "Second, here" }),
                    ],
                    text: "Second",
                  }),
                  new PostPart({
                    delaySeconds: 60,
                    media: [],
                    overrides: [],
                    text: "Third",
                  }),
                ],
                media: [],
                overrides: [],
                text: "First",
              }),
            })
          );

          const { token } = yield* linkTo(editor, post.id, "view");
          const page = yield* visitors.open(token);

          assert.deepStrictEqual(
            page.post.channels.map(({ followUps, text: first }) => ({
              first,
              followUps,
            })),
            [
              {
                first: "First",
                followUps: [
                  { delaySeconds: 0, media: [], text: "Second, here" },
                  { delaySeconds: 60, media: [], text: "Third" },
                ],
              },
            ]
          );
        })
      ),
    timeout
  );

  it.effect(
    "shows the media a channel shows instead of the post's",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* showsChannelMedia() {
          const visitors = yield* VisitorReview;
          const workspaceId = yield* freshWorkspace;
          const own = yield* connect(workspaceId, "mastodon");
          const other = yield* connect(workspaceId, "bluesky");
          const editor = actorAs(yield* freshUser, workspaceId);

          const { post } = yield* PostDrafts.use((drafts) =>
            drafts.create(editor, {
              channelIds: [own, other],
              content: new PostContent({
                media: [],
                overrides: [
                  new TextOverride({
                    channelId: own,
                    media: [
                      new MediaAttachment({
                        altText: "A synthetic picture",
                        mediaId: attachableImage,
                      }),
                    ],
                    text: "First",
                  }),
                ],
                text: "First",
              }),
            })
          );

          const { token } = yield* linkTo(editor, post.id, "view");
          const page = yield* visitors.open(token);

          assert.deepStrictEqual(
            Object.fromEntries(
              page.post.channels.map(({ channelId, media }) => [
                channelId,
                media,
              ])
            ),
            {
              [other]: Option.none(),
              [own]: Option.some([
                { altText: "A synthetic picture", mediaId: attachableImage },
              ]),
            }
          );
          // Its reviewers are shown the file, as any the post shows.
          assert.isTrue(page.previews.has(attachableImage));
        })
      ),
    timeout
  );

  it.effect(
    "approves what its page showed, never what the post says since",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* stalePage() {
          const visitors = yield* VisitorReview;
          const scheduling = yield* PostScheduling;
          const drafts = yield* PostDrafts;
          const review = yield* PostReview;
          const { channelId, editor, postId, workspaceId } = yield* drafted;
          const waiting = { id: postId, workspaceId };
          const ask = { channelIds: [channelId] as const, schedule: at8 };

          yield* withPolicy(workspaceId, "always");
          yield* scheduling.scheduleDraft(editor, postId, ask);

          const { token } = yield* linkTo(editor, postId, "approve");

          // The reviewer opens the page, and reads the post.
          const read = yield* shown(waiting);

          // Its author takes it back, rewrites it and asks again.
          yield* scheduling.unschedule(editor, postId);
          yield* drafts.update(editor, postId, {
            channelIds: [channelId],
            content: contentOf("Launch day is off. Stay home."),
          });
          yield* scheduling.scheduleDraft(editor, postId, ask);

          const changed = new ApprovalChanged({ postId });

          assert.deepStrictEqual(
            yield* Effect.flip(visitors.approve(token, visitor(), read)),
            changed
          );
          assert.deepStrictEqual(
            yield* Effect.flip(
              visitors.requestChanges(token, visitor(), read, "Not Friday.")
            ),
            changed
          );
          assert.deepStrictEqual(
            yield* Effect.flip(review.approve(editor, postId, read)),
            changed
          );
          assert.strictEqual(
            (yield* storedPost(postId)).post.status._tag,
            "awaitingApproval"
          );

          // The same request for other words is not what was read either.
          const now = yield* shown(waiting);

          assert.deepStrictEqual(
            yield* Effect.flip(
              visitors.approve(token, visitor(), {
                requestId: now.requestId,
                subjectHash: read.subjectHash,
              })
            ),
            changed
          );

          // Opened again, the page shows what waits now, which they approve.
          assert.deepStrictEqual(
            yield* visitors.approve(token, visitor(), now),
            { late: false }
          );
        })
      ),
    timeout
  );

  it.effect(
    "sends the post back when a visitor asks for changes, with their comment",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* visitorRefuses() {
          const visitors = yield* VisitorReview;
          const scheduling = yield* PostScheduling;
          const { channelId, editor, postId, workspaceId } = yield* drafted;

          yield* withPolicy(workspaceId, "always");
          yield* scheduling.scheduleDraft(editor, postId, {
            channelIds: [channelId],
            schedule: at8,
          });

          const { token } = yield* linkTo(editor, postId, "approve");

          const comment = yield* visitors.requestChanges(
            token,
            visitor(),
            yield* shown({ id: postId, workspaceId }),
            "Please say Thursday."
          );

          assert.strictEqual(comment.text, "Please say Thursday.");
          assert.strictEqual(
            (yield* storedPost(postId)).post.status._tag,
            "draft"
          );

          // The link still shows the draft, and what was asked.
          const page = yield* visitors.open(token);

          assert.strictEqual(page.post.status, "draft");
          assert.deepStrictEqual(
            page.request.pipe(Option.map(({ status }) => status)),
            Option.some("changesRequested" as const)
          );
        })
      ),
    timeout
  );
});

describe("comments", () => {
  it.effect(
    "make threads, with answers, anchors that follow the text, and a resolution",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* threads() {
          const visitors = yield* VisitorReview;
          const review = yield* PostReview;
          const drafts = yield* PostDrafts;
          const told = yield* Told;
          const { channelId, editor, postId } = yield* drafted;
          const { link, token } = yield* linkTo(editor, postId, "comment");

          const received = `${text} #launch`;

          const first = yield* visitors.comment(
            token,
            visitor("Ada Lovelace"),
            say("Could this be <b>Thursday</b>?\u0007", {
              anchor: Option.some({
                channelId,
                selection: Option.some({
                  quote: "Friday",
                  start: received.indexOf("Friday"),
                }),
              }),
            })
          );

          // Markup stays the text it is; control characters go.
          assert.strictEqual(first.text, "Could this be <b>Thursday</b>?");

          const answer = yield* review.comment(
            editor,
            postId,
            say("It can.", { parentId: Option.some(first.id) })
          );

          assert.deepStrictEqual(answer.parentId, Option.some(first.id));

          // The workspace hears of a visitor's comments once an hour for a
          // link, however many they write: a link's holder cannot flood
          // its members' inboxes. A member's comment is told by itself.
          yield* visitors.comment(token, visitor(), say("And one more."));

          const keys = (yield* told.outcomes)
            .filter(({ kind }) => kind === "commented")
            .map(({ key }) => key);

          assert.deepStrictEqual(keys, [
            `review-comments:${postId}:${link.id}:2026-06-15T07`,
            `review-comment:${answer.id}`,
            `review-comments:${postId}:${link.id}:2026-06-15T07`,
          ]);

          // The text changes around the words: the anchor follows them.
          const rewritten = `Big news! ${text}`;

          yield* drafts.update(editor, postId, {
            channelIds: [channelId],
            content: contentOf(rewritten),
          });

          const page = yield* visitors.open(token);
          const [root] = page.comments;

          const selection = root?.anchor.pipe(
            Option.flatMap((anchor) => anchor.selection),
            Option.getOrThrow
          );

          assert.deepStrictEqual(
            selection === undefined
              ? Option.none()
              : locate(selection, page.post.channels[0]?.text ?? ""),
            Option.some({
              end: rewritten.indexOf("Friday") + "Friday".length,
              start: rewritten.indexOf("Friday"),
            })
          );

          const resolved = yield* review.resolve(
            editor,
            postId,
            first.id,
            true
          );

          assert.isTrue(Option.isSome(resolved.resolution));
          assert.deepStrictEqual(
            (yield* told.outcomes).map(({ kind }) => kind),
            ["commented", "commented", "commented"]
          );
        })
      ),
    timeout
  );

  it.effect(
    "refuse what cannot be kept: no text, no name, a bad address, a wrong thread or selection",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* refuses() {
          const visitors = yield* VisitorReview;
          const review = yield* PostReview;
          const { channelId, editor, postId, workspaceId } = yield* drafted;
          const { token } = yield* linkTo(editor, postId, "comment");
          const first = yield* visitors.comment(token, visitor(), say("One."));

          const answer = yield* review.comment(
            editor,
            postId,
            say("Two.", { parentId: Option.some(first.id) })
          );

          const elsewhere = yield* connect(workspaceId, "mastodon");

          const problems = yield* Effect.forEach(
            [
              visitors.comment(token, visitor(), say(" \n ")),
              visitors.comment(token, visitor("​"), say("Hello.")),
              // An answer to an answer.
              visitors.comment(
                token,
                visitor(),
                say("Three.", { parentId: Option.some(answer.id) })
              ),
              // About a channel the post does not go to.
              visitors.comment(
                token,
                visitor(),
                say("Here?", {
                  anchor: Option.some({
                    channelId: elsewhere,
                    selection: Option.none(),
                  }),
                })
              ),
              // Words that are not where it says.
              visitors.comment(
                token,
                visitor(),
                say("This.", {
                  anchor: Option.some({
                    channelId,
                    selection: Option.some({ quote: "Thursday", start: 0 }),
                  }),
                })
              ),
            ],
            (attempt) =>
              Effect.flip(attempt).pipe(
                Effect.map((failure) =>
                  failure instanceof CommentRejected
                    ? failure.problem
                    : failure._tag
                )
              ),
            { concurrency: 1 }
          );

          assert.deepStrictEqual(problems, [
            "text",
            "name",
            "parent",
            "anchor",
            "selection",
          ]);
        })
      ),
    timeout
  );

  it.effect(
    "are for those who write posts or approve them, and for their own workspace",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* whoComments() {
          const review = yield* PostReview;
          const { editor, postId, workspaceId } = yield* drafted;

          const viewer = actorAs(
            yield* freshUser,
            workspaceId,
            permissionsFor("viewer")
          );

          const note = yield* review.comment(editor, postId, say("A note."));

          assert.lengthOf((yield* review.thread(viewer, postId)).comments, 1);
          assert.deepStrictEqual(
            yield* Effect.flip(review.comment(viewer, postId, say("Mine."))),
            new MissingPermission({ permission: "post:create" })
          );

          // Staff acting as a member read, and write nothing under the
          // member's name: a comment is shown to people outside the
          // workspace, and stays once the staff member is gone.
          const staff = impersonating(
            yield* freshUser,
            yield* freshUser,
            workspaceId
          );

          const [root] = (yield* review.thread(staff, postId)).comments;

          assert.deepStrictEqual(
            yield* Effect.flip(review.comment(staff, postId, say("Not mine."))),
            new MissingPermission({ permission: "post:create" })
          );
          assert.deepStrictEqual(
            yield* Effect.flip(
              review.resolve(staff, postId, root?.id ?? note.id, true)
            ),
            new MissingPermission({ permission: "post:create" })
          );

          const outsider = actorAs(yield* freshUser, yield* freshWorkspace);

          assert.deepStrictEqual(
            yield* Effect.flip(review.thread(outsider, postId)),
            new ReviewPostNotFound({ postId })
          );
        })
      ),
    timeout
  );
});

describe("what visitors gave", () => {
  it.effect(
    "ends by itself: the name after 24 months, and never holds an address",
    () =>
      onReviewServerAt(
        start,
        Effect.gen(function* retention() {
          const visitors = yield* VisitorReview;
          const purging = yield* PurgeReviewData;
          const sql = yield* SqlClient.SqlClient;
          const { editor, postId } = yield* drafted;
          const { token } = yield* linkTo(editor, postId, "comment");

          const comment = yield* visitors.comment(
            token,
            visitor("Ada Lovelace"),
            say("A comment to keep a while.")
          );

          const kept = sql<{
            readonly name: string | null;
          }>`SELECT visitor_name AS name FROM review.comments WHERE id = ${comment.id}`.pipe(
            Effect.map(([row]) => row)
          );

          yield* purging.purge;

          assert.deepStrictEqual(yield* kept, { name: "Ada Lovelace" });

          // Peal mails nobody without an account, so it keeps no address
          // of theirs: no column holds one.
          const columns = yield* sql<{
            readonly name: string;
          }>`SELECT column_name AS name FROM information_schema.columns WHERE table_schema = 'review' AND table_name = 'comments' AND column_name LIKE 'visitor%'`;

          assert.deepStrictEqual(
            columns.map(({ name }) => name),
            ["visitor_name"]
          );

          // A comment written more than 24 months ago loses its name.
          yield* sql`UPDATE review.comments SET created_at = ${new Date("2024-06-14T07:00:00Z")} WHERE id = ${comment.id}`;

          assert.deepStrictEqual(yield* purging.purge, { names: 1 });
          assert.deepStrictEqual(yield* kept, { name: null });
        })
      ),
    timeout
  );
});
