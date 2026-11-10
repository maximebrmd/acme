import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import {
  Api,
  DuplicatePost,
  Forbidden,
  IdempotencyKeyReused,
  ImportUnreadable,
  maxBulkPosts,
  PlanLimitReached,
  PostContentInvalid,
  UnknownChannels,
} from "peal-contract";
import type { BulkPost, Member, PostContent, PostRefusal } from "peal-contract";

import { PostsHandlers } from "#publishing/api/posts.ts";
import { PostAllowance } from "#publishing/application/post-allowance.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { memberOf } from "#test/channels/support.ts";
import { setTime, utc } from "#test/publishing/infrastructure/harness.ts";
import {
  connect,
  onPostsServerAt,
  postsServerWith,
} from "#test/publishing/posts-server.ts";
import { attachableMedia } from "#test/publishing/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// POST …/posts/bulk and …/posts/import: several posts in one request,
// each answered on its own.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const clientAs = (member: Member) =>
  HttpApiTest.groups(Api, ["posts"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        PostsHandlers.pipe(Layer.provideMerge(securityTest(member))),
        HttpServer.layerServices
      )
    )
  );

const as = (
  role: "contributor" | "editor" | "viewer",
  workspaceId: WorkspaceId
) => clientAs(memberOf(workspaceId, permissionsFor(role)));

const text = (body: string): PostContent => ({
  media: [],
  overrides: [],
  text: body,
});

const freshWorkspace = newId(WorkspaceIdSchema);

const at = (channel: ChannelId, body: string, instant: string): BulkPost => ({
  channelIds: [channel],
  content: text(body),
  when: { _tag: "at", at: utc(instant), timeZone: "Europe/Paris" },
});

const isCreated = <A extends { readonly _tag: string }>(
  result: A
): result is Extract<A, { readonly _tag: "created" }> =>
  result._tag === "created";

// The post an item or a row made, or a defect when it made none.
const madeBy = <A extends { readonly _tag: string }>(
  results: readonly A[],
  place: number
) => {
  const result = results[place];

  return result !== undefined && isCreated(result)
    ? Effect.succeed(result)
    : Effect.die(`Nothing was made at ${String(place)}`);
};

const refusalAt = (
  results: readonly (
    | { readonly _tag: "refused"; readonly refusal: PostRefusal }
    | { readonly _tag: string }
  )[],
  place: number
) => {
  const result = results[place];

  return result !== undefined && "refusal" in result
    ? result.refusal
    : undefined;
};

describe("the bulk endpoint", () => {
  it.effect(
    "answers each post on its own, and the same request sent again with the posts it made",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* bulk() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const editor = yield* as("editor", workspaceId);
          const params = { workspaceId };
          const headers = { "idempotency-key": "synthetic-bulk-key" };

          const posts = [
            at(channel, "A synthetic series.", "2026-06-16T08:00:00Z"),
            // The same content at another time is another item.
            at(channel, "A synthetic series.", "2026-06-17T08:00:00Z"),
            at(channel, "a".repeat(501), "2026-06-16T08:00:00Z"),
            // The first item again, an hour on.
            at(channel, "A synthetic series.", "2026-06-16T09:00:00Z"),
            {
              ...at(channel, "Elsewhere.", "2026-06-16T08:00:00Z"),
              channelIds: ["not-a-channel"],
            },
          ] satisfies BulkPost[];

          const response = yield* editor.posts.bulk({
            headers,
            params,
            payload: { posts },
            responseMode: "response-only",
          });

          // Read, and answered item by item: some made, some not.
          assert.strictEqual(response.status, 200);

          const first = yield* editor.posts.bulk({
            headers,
            params,
            payload: { posts },
          });

          assert.strictEqual(first.created, 2);
          assert.strictEqual(first.refused, 3);
          assert.deepStrictEqual(
            first.items.map(({ _tag, index }) => [index, _tag]),
            [
              [0, "created"],
              [1, "created"],
              [2, "refused"],
              [3, "refused"],
              [4, "refused"],
            ]
          );

          // The second call was the first sent again: the same posts.
          const one = yield* madeBy(first.items, 0);
          const two = yield* madeBy(first.items, 1);

          assert.isTrue(one.replayed);
          assert.isTrue(two.replayed);
          assert.notStrictEqual(one.post.id, two.post.id);
          assert.strictEqual(one.post.status, "scheduled");
          assert.deepStrictEqual(one.post.schedule, {
            at: utc("2026-06-16T08:00:00Z"),
            timeZone: "Europe/Paris",
          });

          const long = refusalAt(first.items, 2);
          const twice = refusalAt(first.items, 3);

          assert.instanceOf(long, PostContentInvalid);
          assert.strictEqual(long.violations[0]?._tag, "textTooLong");
          assert.instanceOf(twice, DuplicatePost);
          assert.strictEqual(twice.duplicates[0]?.postId, one.post.id);
          assert.instanceOf(refusalAt(first.items, 4), UnknownChannels);

          // Two posts, however often the request is sent.
          const listed = yield* editor.posts.list({
            params,
            query: {
              from: utc("2026-06-16T00:00:00Z"),
              to: utc("2026-06-18T00:00:00Z"),
            },
          });

          assert.lengthOf(listed, 2);
        })
      ),
    timeout
  );

  it.effect(
    "keeps each item under the request's key and its place, or under its own",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* keys() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const editor = yield* as("editor", workspaceId);
          const params = { workspaceId };
          const headers = { "idempotency-key": "synthetic-bulk-key" };

          const posts = [
            at(channel, "A synthetic series.", "2026-06-16T08:00:00Z"),
            at(channel, "A synthetic series.", "2026-06-17T08:00:00Z"),
            at(channel, "a".repeat(501), "2026-06-16T08:00:00Z"),
          ] satisfies BulkPost[];

          yield* editor.posts.bulk({ headers, params, payload: { posts } });

          // An item changed under the request's key is a mistake, there
          // only; one that made nothing the first time, fixed since, is
          // made.
          const changed = yield* editor.posts.bulk({
            headers,
            params,
            payload: {
              posts: [
                ...posts.slice(0, 1),
                at(channel, "Other words.", "2026-06-17T08:00:00Z"),
                at(channel, "Short enough now.", "2026-06-16T08:00:00Z"),
              ],
            },
          });

          assert.deepStrictEqual(
            changed.items.map((item) =>
              item._tag === "refused"
                ? item.refusal._tag
                : `${item._tag}:${String(item.replayed)}`
            ),
            ["created:true", "IdempotencyKeyReused", "created:false"]
          );
          assert.instanceOf(refusalAt(changed.items, 1), IdempotencyKeyReused);

          // An item's own key is its own, whatever the request's.
          const keyed = {
            ...at(channel, "A synthetic keyed post.", "2026-06-19T08:00:00Z"),
            idempotencyKey: "synthetic-item-key",
          };

          const own = yield* editor.posts.bulk({
            headers: {},
            params,
            payload: { posts: [keyed] },
          });

          const again = yield* editor.posts.bulk({
            headers: { "idempotency-key": "another-request" },
            params,
            payload: {
              posts: [
                at(channel, "A synthetic filler.", "2026-06-20T08:00:00Z"),
                keyed,
              ],
            },
          });

          const replayed = yield* madeBy(again.items, 1);

          assert.isTrue(replayed.replayed);
          assert.strictEqual(
            replayed.post.id,
            (yield* madeBy(own.items, 0)).post.id
          );
        })
      ),
    timeout
  );

  it.effect(
    "needs the right to publish, and takes fifty posts at most",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* bounds() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const editor = yield* as("editor", workspaceId);
          const params = { workspaceId };

          const keyed = at(
            channel,
            "A synthetic post.",
            "2026-06-19T08:00:00Z"
          );

          const posts = [keyed];

          // Drafting is not publishing, and a request has its bounds.
          const contributor = yield* as("contributor", workspaceId);

          const denied = yield* contributor.posts
            .bulk({ headers: {}, params, payload: { posts } })
            .pipe(Effect.flip);

          assert.instanceOf(denied, Forbidden);

          const tooMany = yield* editor.posts
            .bulk({
              headers: {},
              params,
              payload: {
                posts: Array.from({ length: maxBulkPosts + 1 }, () => keyed),
              },
            })
            .pipe(Effect.flip);

          assert.strictEqual(tooMany._tag, "SchemaError");

          const none = yield* editor.posts
            .bulk({ headers: {}, params, payload: { posts: [] } })
            .pipe(Effect.flip);

          assert.strictEqual(none._tag, "SchemaError");
        })
      ),
    timeout
  );

  const TwoPostsServer = postsServerWith(
    attachableMedia(),
    Layer.succeed(
      PostAllowance,
      PostAllowance.of({
        channels: () =>
          Effect.succeed({ allowed: Option.none(), connected: 0 }),
        members: () => Effect.succeed({ allowed: Option.none(), taken: 1 }),
        scheduledPerMonth: () => Effect.succeed(Option.some(2)),
      })
    )
  );

  it.effect(
    "keeps to the plan's month across the request",
    () =>
      Effect.gen(function* limited() {
        const workspaceId = yield* freshWorkspace;
        const channel = yield* connect(workspaceId, "mastodon");
        const editor = yield* as("editor", workspaceId);

        const answered = yield* editor.posts.bulk({
          headers: {},
          params: { workspaceId },
          payload: {
            posts: [
              at(channel, "June, one.", "2026-06-16T08:00:00Z"),
              at(channel, "June, two.", "2026-06-17T08:00:00Z"),
              at(channel, "June, three.", "2026-06-18T08:00:00Z"),
              at(channel, "July, one.", "2026-07-01T08:00:00Z"),
            ],
          },
        });

        assert.deepStrictEqual(
          answered.items.map(({ _tag }) => _tag),
          ["created", "created", "refused", "created"]
        );

        const third = refusalAt(answered.items, 2);

        assert.instanceOf(third, PlanLimitReached);
        assert.deepStrictEqual(
          [third.limit, third.allowed, third.used],
          ["scheduledPosts", 2, 2]
        );
      }).pipe(Effect.provide(TwoPostsServer), (test) =>
        setTime(start).pipe(Effect.andThen(test))
      ),
    timeout
  );
});

describe("the import endpoint", () => {
  it.effect(
    "checks the whole file first, and makes its posts only when every row is valid",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* imports() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const other = yield* connect(workspaceId, "mastodon");
          const editor = yield* as("editor", workspaceId);
          const params = { workspaceId };

          const good = [
            "text,channels,at,time_zone",
            `"A synthetic post, from a file",${channel} ${other},2026-12-01 09:00,Europe/Paris`,
            `Another synthetic post,${channel},2026-12-02T09:00:00Z,`,
          ].join("\n");

          const scheduledIn = editor.posts.list({
            params,
            query: {
              from: utc("2026-12-01T00:00:00Z"),
              to: utc("2026-12-03T00:00:00Z"),
            },
          });

          // A dry run checks, and makes nothing.
          const dry = yield* editor.posts.import({
            headers: {},
            params,
            payload: { csv: good, dryRun: true },
          });

          assert.deepStrictEqual(dry, {
            created: 0,
            dryRun: true,
            rows: [
              { _tag: "valid", row: 1 },
              { _tag: "valid", row: 2 },
            ],
          });
          assert.lengthOf(yield* scheduledIn, 0);

          // One row at fault keeps the whole file from being made.
          const bad = yield* editor.posts.import({
            headers: {},
            params,
            payload: {
              csv: [
                good,
                `${"a".repeat(501)},${channel},now,`,
                `No time,${channel},,`,
                "Nowhere,not-a-channel,now,",
              ].join("\n"),
            },
          });

          assert.strictEqual(bad.created, 0);
          assert.isFalse(bad.dryRun);
          assert.deepStrictEqual(
            bad.rows.map(({ _tag, row }) => [row, _tag]),
            [
              [1, "valid"],
              [2, "valid"],
              [3, "refused"],
              [4, "unreadable"],
              [5, "refused"],
            ]
          );

          const untimed = bad.rows.at(3);

          assert.instanceOf(refusalAt(bad.rows, 2), PostContentInvalid);
          assert.deepStrictEqual(
            untimed?._tag === "unreadable" ? untimed.problems : [],
            [{ column: "at", problem: "missing" }]
          );
          assert.lengthOf(yield* scheduledIn, 0);

          // Every row valid: each is made, its local time read in its zone.
          const headers = { "idempotency-key": "synthetic-import-key" };

          const made = yield* editor.posts.import({
            headers,
            params,
            payload: { csv: good },
          });

          assert.strictEqual(made.created, 2);

          const first = yield* madeBy(made.rows, 0);

          assert.isFalse(first.replayed);
          assert.deepStrictEqual(first.post.schedule, {
            at: utc("2026-12-01T08:00:00Z"),
            timeZone: "Europe/Paris",
          });
          assert.strictEqual(
            first.post.content.text,
            "A synthetic post, from a file"
          );
          assert.lengthOf(first.post.targets, 2);
          assert.lengthOf(yield* scheduledIn, 2);
        })
      ),
    timeout
  );

  it.effect(
    "answers a file sent again with the posts it made, under its key only",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* again() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const editor = yield* as("editor", workspaceId);
          const params = { workspaceId };
          const headers = { "idempotency-key": "synthetic-import-key" };

          const good = [
            "text,channels,at,time_zone",
            `A synthetic post from a file,${channel},2026-12-01 09:00,Europe/Paris`,
            `Another synthetic post,${channel},2026-12-02T09:00:00Z,`,
          ].join("\n");

          const scheduledIn = editor.posts.list({
            params,
            query: {
              from: utc("2026-12-01T00:00:00Z"),
              to: utc("2026-12-03T00:00:00Z"),
            },
          });

          const made = yield* editor.posts.import({
            headers,
            params,
            payload: { csv: good },
          });

          // The file sent again under its key answers the same posts.
          const sentAgain = yield* editor.posts.import({
            headers,
            params,
            payload: { csv: good },
          });

          assert.deepStrictEqual(
            sentAgain.rows.map((row) =>
              row._tag === "created" ? [row.post.id, row.replayed] : []
            ),
            made.rows.map((row) =>
              row._tag === "created" ? [row.post.id, true] : []
            )
          );
          assert.lengthOf(yield* scheduledIn, 2);

          // A row changed under the file's key is a mistake: found by the
          // check, so nothing is made, the rows after it included.
          const changed = yield* editor.posts.import({
            headers,
            params,
            payload: {
              csv: [
                "text,channels,at,time_zone",
                `Other words under the same key,${channel},2026-12-01 09:00,Europe/Paris`,
                `Another synthetic post,${channel},2026-12-02T09:00:00Z,`,
                `A third synthetic post,${channel},2026-12-02T10:00:00Z,`,
              ].join("\n"),
            },
          });

          assert.strictEqual(changed.created, 0);
          assert.deepStrictEqual(
            changed.rows.map(({ _tag }) => _tag),
            ["refused", "valid", "valid"]
          );
          assert.instanceOf(refusalAt(changed.rows, 0), IdempotencyKeyReused);
          assert.lengthOf(yield* scheduledIn, 2);

          // Without its key, it is the same content sent twice.
          const twice = yield* editor.posts.import({
            headers: {},
            params,
            payload: { csv: good },
          });

          assert.strictEqual(twice.created, 0);
          assert.isTrue(
            twice.rows.every(
              (row) =>
                row._tag === "refused" && row.refusal instanceof DuplicatePost
            )
          );

          // A file that is no list of posts.
          const unreadable = yield* editor.posts
            .import({
              headers: {},
              params,
              payload: { csv: "text,channels,at,colour\na,b,now,red" },
            })
            .pipe(Effect.flip);

          assert.instanceOf(unreadable, ImportUnreadable);
          assert.strictEqual(unreadable.problem, "unknownColumn");
          assert.strictEqual(unreadable.column, "colour");

          // Importing is publishing, a dry run included.
          const contributor = yield* as("contributor", workspaceId);

          const denied = yield* contributor.posts
            .import({
              headers: {},
              params,
              payload: { csv: good, dryRun: true },
            })
            .pipe(Effect.flip);

          assert.instanceOf(denied, Forbidden);
        })
      ),
    timeout
  );
});
