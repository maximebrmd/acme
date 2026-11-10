// The posting API in a workspace that asks for approvals, through the whole
// server: every way of making a post in one call is held, a check says so,
// a wait answers at once, the same content is not held twice, and the
// workspace's log keeps what its members decided.
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { ActivityPageSchema } from "peal-contract";

import {
  apiKeyOf,
  bodyOf,
  MigratedSqlLive,
  signedUpUnconfirmed,
  TestApp,
  unconfirmedEmails,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";
import { seedChannel } from "#test/workspace/integration/seed.ts";

const Test = Layer.mergeAll(
  TestApp.layerWith(unconfirmedEmails),
  MigratedSqlLive
);

const PageJsonSchema = Schema.toCodecJson(ActivityPageSchema);

const PostSchema = Schema.Struct({ id: Schema.String, status: Schema.String });

const ApprovalsSchema = Schema.Array(
  Schema.Struct({
    id: Schema.String,
    postId: Schema.String,
    subjectHash: Schema.String,
  })
);

const BulkSchema = Schema.Struct({
  created: Schema.Int,
  items: Schema.Array(
    Schema.Struct({
      _tag: Schema.String,
      post: Schema.optionalKey(PostSchema),
      refusal: Schema.optionalKey(Schema.Struct({ code: Schema.String })),
    })
  ),
});

const ImportSchema = Schema.Struct({
  created: Schema.Int,
  rows: Schema.Array(
    Schema.Struct({ _tag: Schema.String, post: Schema.optionalKey(PostSchema) })
  ),
});

const content = (text: string) => ({ media: [], overrides: [], text });

const at = (instant: string) => ({ _tag: "at", at: instant, timeZone: "UTC" });

layer(Test, { excludeTestServices: true, timeout: "180 seconds" })(
  "the posting API where posts wait for an approval",
  (it) => {
    it.effect(
      "holds what is sent, one post, several or a file's rows, says so of a check, and answers a wait at once",
      () =>
        Effect.gen(function* held() {
          const app = yield* TestApp;
          const owner = yield* signedUpUnconfirmed("approval-posting");
          const workspaceId = yield* workspaceOf(owner, "Approvals");
          const channel = yield* seedChannel(workspaceId, "held@social.test");
          const base = `/api/workspaces/${workspaceId}`;
          const headers = { cookie: owner.cookies };

          const policy = yield* app.request(`${base}/review/settings`, {
            body: { approvalPolicy: "always" },
            headers,
            method: "PUT",
          });

          assert.strictEqual(policy.status, 200);

          const post = (text: string, instant: string) => ({
            channelIds: [channel],
            content: content(text),
            when: at(instant),
          });

          // A check makes nothing, and says the post would wait.
          const checked = yield* app.request(`${base}/posts/validate`, {
            body: post("A synthetic post to hold.", "2031-03-04T09:00:00Z"),
            headers,
          });

          assert.deepInclude(checked.body, {
            awaitsApproval: true,
            valid: true,
          });

          // Sent, and asked to wait for its outcome: none can come before
          // a person approves it, so the answer is the post as it stands.
          const before = Date.now();

          const sent = yield* app.request(`${base}/posts/send?wait=30`, {
            body: post("A synthetic post to hold.", "2031-03-04T09:00:00Z"),
            headers,
          });

          assert.strictEqual(sent.status, 201);
          assert.isBelow(Date.now() - before, 10_000);

          const first = yield* bodyOf(PostSchema, sent);

          assert.strictEqual(first.status, "awaitingApproval");

          const outcome = yield* app.request(
            `${base}/posts/${first.id}/outcome?wait=30`,
            { headers }
          );

          assert.strictEqual(
            (yield* bodyOf(PostSchema, outcome)).status,
            "awaitingApproval"
          );
          assert.isBelow(Date.now() - before, 10_000);

          // The same content again would wait twice, and go out twice:
          // refused, and no second approval is asked for it.
          const again = yield* app.request(`${base}/posts/send`, {
            body: post("A synthetic post to hold.", "2031-03-04T10:00:00Z"),
            headers,
          });

          assert.strictEqual(again.status, 409);
          assert.deepInclude(again.body, { code: "duplicate_post" });

          // Several at once: each held on its own, the repeated one refused.
          const bulk = yield* app.request(`${base}/posts/bulk`, {
            body: {
              posts: [
                post("A second synthetic post.", "2031-03-05T09:00:00Z"),
                post("A synthetic post to hold.", "2031-03-04T11:00:00Z"),
              ],
            },
            headers,
          });

          const several = yield* bodyOf(BulkSchema, bulk);

          assert.deepStrictEqual(
            several.items.map(({ _tag, post: made, refusal }) => [
              _tag,
              made?.status ?? refusal?.code,
            ]),
            [
              ["created", "awaitingApproval"],
              ["refused", "duplicate_post"],
            ]
          );

          // A file's rows too.
          const imported = yield* app.request(`${base}/posts/import`, {
            body: {
              csv: `text,channels,at\nA third synthetic post.,${channel},2031-03-06T09:00:00Z`,
            },
            headers,
          });

          const rows = yield* bodyOf(ImportSchema, imported);

          assert.deepStrictEqual(
            rows.rows.map(({ _tag, post: made }) => [_tag, made?.status]),
            [["created", "awaitingApproval"]]
          );

          // One approval waits for each post made, and none for those
          // refused.
          const pending = yield* bodyOf(
            ApprovalsSchema,
            yield* app.request(`${base}/approvals`, { headers })
          );

          const made = [
            first.id,
            several.items[0]?.post?.id,
            rows.rows[0]?.post?.id,
          ];

          assert.deepStrictEqual(
            pending.map(({ postId }) => postId).toSorted(),
            made.map(String).toSorted()
          );

          // An API key that reads asks the platform nothing it changes:
          // a lookup is no change, and a decision by a member is one.
          const asked = pending.find(({ postId }) => postId === first.id);

          const changes = yield* app.request(
            `${base}/posts/${first.id}/request-changes`,
            {
              body: {
                approvalId: asked?.id,
                comment: "A synthetic comment asking for a change.",
                subjectHash: asked?.subjectHash,
              },
              headers,
            }
          );

          assert.strictEqual(changes.status, 200);

          const { key } = yield* apiKeyOf(owner, workspaceId, ["channel:read"]);

          const lookup = yield* app.request(
            `${base}/channels/${channel}/lookups/nothing`,
            { body: {}, headers: { authorization: `Bearer ${key}` } }
          );

          assert.strictEqual(lookup.status, 404);

          const log = yield* bodyOf(
            PageJsonSchema,
            yield* app.request(`${base}/activity`, { headers })
          );

          const operations = log.items.map(({ operation }) => operation);

          // Who decided is the member, by id: never what they wrote.
          assert.deepInclude(
            log.items.find(
              ({ operation }) => operation === "review.requestChanges"
            ),
            {
              actor: { _tag: "user", userId: owner.id },
              objectIds: { postId: first.id },
              status: 200,
              via: "session",
            }
          );
          assert.notInclude(JSON.stringify(log.items), "synthetic comment");
          assert.includeMembers(operations, [
            "review.updateSettings",
            "posts.send",
            "posts.bulk",
            "posts.import",
          ]);
          // Neither the check nor the lookup asked to change anything.
          assert.notInclude(operations, "posts.validate");
          assert.notInclude(operations, "lookups.run");
        })
    );
  }
);
