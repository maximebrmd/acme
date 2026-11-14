// Moving a channel between two of a partner's customers, through the
// partner API, on Postgres: who may, between which workspaces, what goes
// with the channel and what stays, a post in flight, and the erasure of
// the workspace it went to.
import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option, Redacted, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { encryptTokens } from "#channels/application/channel-tokens.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { syntheticKeyring, TokenCipherTest } from "#test/channels/support.ts";

import {
  bodyOf,
  MigratedSqlLive,
  TestApp,
  unconfirmedEmails,
} from "./harness.ts";
import {
  bearer,
  customerOf,
  everyPermission,
  everyScope,
  keyOf,
  partnerOf,
} from "./partner-support.ts";
import { seedChannel, seedPost } from "./seed.ts";

const MovesLive = Layer.mergeAll(
  TestApp.layerWith({
    ...unconfirmedEmails,
    PEAL_PARTNER_SELF_SERVICE: "true",
    PEAL_TOKEN_KEYS: syntheticKeyring,
  }),
  MigratedSqlLive
);

const ChannelSchema = Schema.Struct({
  handle: Schema.String,
  id: Schema.String,
  label: Schema.NullOr(Schema.String),
  platform: Schema.String,
});

const ChannelsSchema = Schema.Array(ChannelSchema);

const ActivitySchema = Schema.Struct({
  items: Schema.Array(Schema.Struct({ operation: Schema.String })),
});

const IdsSchema = Schema.Array(Schema.Struct({ id: Schema.String }));

const CountSchema = Schema.Array(Schema.Struct({ rows: Schema.Number }));

// A channel of the workspace whose tokens the server's keyring opens.
const connectedIn = Effect.fn("connectedIn")(function* connectedIn(
  workspaceId: string,
  handle: string
) {
  const sql = yield* SqlClient.SqlClient;
  const id = yield* seedChannel(workspaceId, handle);

  const credentials = yield* encryptTokens(
    {
      accessToken: Redacted.make("synthetic-access-token"),
      expiresAt: Option.none(),
      refreshToken: Option.none(),
      renewable: false,
      scopes: [],
    },
    ChannelIdSchema.make(id)
  ).pipe(Effect.provide(TokenCipherTest), Effect.orDie);

  yield* sql`UPDATE channels.channels SET access_token = ${credentials.accessToken}, token_key_id = 'test-key', label = 'Kept behind' WHERE id = ${id}`;

  return id;
});

const channelsOf = Effect.fn("channelsOf")(function* channelsOf(
  key: string,
  workspaceId: string
) {
  const app = yield* TestApp;

  const reply = yield* app.request(`/api/workspaces/${workspaceId}/channels`, {
    headers: bearer(key),
  });

  return yield* bodyOf(ChannelsSchema, reply);
});

layer(MovesLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "moving a channel between a partner's customers",
  (it) => {
    it.effect(
      "makes it the other workspace's, under a new id, and leaves the posts behind",
      () =>
        Effect.gen(function* moves() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const { home, owner } = yield* partnerOf("moves");

          const { key } = yield* keyOf(owner, home, {
            permissions: [...everyPermission, "activity:read"],
          });

          const from = yield* customerOf(key, "From customer");
          const to = yield* customerOf(key, "To customer");

          const channelId = yield* connectedIn(
            from.id,
            "@moved@social.example"
          );

          const postId = yield* seedPost(from.id, channelId, "Stays behind");

          const reply = yield* app.request(
            `/api/partner/workspaces/${from.id}/channels/${channelId}/move`,
            { body: { toWorkspaceId: to.id }, headers: bearer(key) }
          );

          assert.strictEqual(reply.status, 200);

          const moved = yield* bodyOf(ChannelSchema, reply);

          assert.notStrictEqual(moved.id, channelId);
          assert.deepStrictEqual(
            { ...moved, id: "" },
            {
              handle: "@moved@social.example",
              id: "",
              label: null,
              platform: "mastodon",
            }
          );
          assert.deepStrictEqual(yield* channelsOf(key, from.id), []);
          assert.deepStrictEqual(
            (yield* channelsOf(key, to.id)).map(({ id }) => id),
            [moved.id]
          );

          // The post is the workspace's it was made in, its target on the
          // channel it named, which fails there as a disconnected one's.
          const [post] =
            yield* sql`SELECT count(*)::int AS rows FROM publishing.post_targets t JOIN publishing.posts p ON p.id = t.post_id WHERE p.id = ${postId} AND p.workspace_id = ${from.id} AND t.channel_id = ${channelId}`.pipe(
              Effect.flatMap(Schema.decodeUnknownEffect(CountSchema))
            );

          assert.deepStrictEqual(post, { rows: 1 });

          // Each workspace's log says the channel left, or came.
          for (const workspaceId of [from.id, to.id]) {
            const log = yield* app.request(
              `/api/workspaces/${workspaceId}/activity`,
              { headers: bearer(key) }
            );

            assert.include(
              (yield* bodyOf(ActivitySchema, log)).items.map(
                ({ operation }) => operation
              ),
              "partner.moveChannel"
            );
          }

          // It moves back, under a new id again, and the workspace it went
          // to keeps nothing of it.
          const back = yield* app.request(
            `/api/partner/workspaces/${to.id}/channels/${moved.id}/move`,
            { body: { toWorkspaceId: from.id }, headers: bearer(key) }
          );

          assert.strictEqual(back.status, 200);
          assert.lengthOf(yield* channelsOf(key, to.id), 0);
          assert.lengthOf(yield* channelsOf(key, from.id), 1);
        })
    );

    it.effect(
      "refuses what the key may not do, and workspaces not its partner's",
      () =>
        Effect.gen(function* refuses() {
          const app = yield* TestApp;
          const { home, owner } = yield* partnerOf("refuses");
          const { key } = yield* keyOf(owner, home);
          const from = yield* customerOf(key, "Refusing from");
          const to = yield* customerOf(key, "Refusing to");
          const channelId = yield* connectedIn(from.id, "@kept@social.example");
          const other = yield* partnerOf("another");
          const { key: otherKey } = yield* keyOf(other.owner, other.home);
          const stranger = yield* customerOf(otherKey, "Another's customer");

          const move = (
            using: string,
            path: { readonly channel: string; readonly from: string },
            toWorkspaceId: string
          ) =>
            app.request(
              `/api/partner/workspaces/${path.from}/channels/${path.channel}/move`,
              { body: { toWorkspaceId }, headers: bearer(using) }
            );

          const { key: readOnly } = yield* keyOf(owner, home, {
            scopes: ["workspaces:read"],
          });

          const { key: connectOnly } = yield* keyOf(owner, home, {
            permissions: everyPermission.filter(
              (permission) => permission !== "channel:disconnect"
            ),
            scopes: everyScope,
          });

          const statuses = yield* Effect.all([
            move(readOnly, { channel: channelId, from: from.id }, to.id),
            move(connectOnly, { channel: channelId, from: from.id }, to.id),
            // The home workspace is no customer, another partner's none of
            // its own.
            move(key, { channel: channelId, from: from.id }, home),
            move(key, { channel: channelId, from: from.id }, stranger.id),
            move(otherKey, { channel: channelId, from: from.id }, stranger.id),
            move(key, { channel: randomUUID(), from: from.id }, to.id),
            move(key, { channel: "not-a-channel", from: from.id }, to.id),
            move(key, { channel: channelId, from: from.id }, from.id),
          ]).pipe(Effect.map((replies) => replies.map(({ status }) => status)));

          assert.deepStrictEqual(
            statuses,
            [403, 403, 404, 404, 404, 404, 404, 409]
          );
          assert.lengthOf(yield* channelsOf(key, from.id), 1);
        })
    );

    it.effect(
      "refuses a workspace that has the account, and waits for a post going out",
      () =>
        Effect.gen(function* busy() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const { home, owner } = yield* partnerOf("busy");
          const { key } = yield* keyOf(owner, home);
          const from = yield* customerOf(key, "Busy from");
          const to = yield* customerOf(key, "Busy to");
          const channelId = yield* connectedIn(from.id, "@busy@social.example");

          // The same account connected in the other workspace already.
          const there = yield* connectedIn(to.id, "@busy@social.example");

          yield* sql`UPDATE channels.channels SET account_id = (SELECT account_id FROM channels.channels WHERE id = ${channelId}) WHERE id = ${there}`;

          const taken = yield* app.request(
            `/api/partner/workspaces/${from.id}/channels/${channelId}/move`,
            { body: { toWorkspaceId: to.id }, headers: bearer(key) }
          );

          assert.strictEqual(taken.status, 409);
          assert.deepInclude(taken.body, {
            _tag: "ChannelAccountTaken",
            channelId: there,
          });

          yield* sql`DELETE FROM channels.channels WHERE id = ${there}`;

          // A call through the channel, begun and not ended.
          const postId = yield* seedPost(
            from.id,
            channelId,
            "Going out",
            "publishing"
          );

          const [target] =
            yield* sql`SELECT id FROM publishing.post_targets WHERE post_id = ${postId}`.pipe(
              Effect.flatMap(Schema.decodeUnknownEffect(IdsSchema))
            );

          const callKey = randomUUID();

          yield* sql`INSERT INTO publishing.publication_calls (idempotency_key, target_id, round, attempt, operation, started_at)
            VALUES (${callKey}, ${target?.id ?? ""}, 1, 1, 'publish', now())`;

          const going = yield* app.request(
            `/api/partner/workspaces/${from.id}/channels/${channelId}/move`,
            { body: { toWorkspaceId: to.id }, headers: bearer(key) }
          );

          assert.strictEqual(going.status, 409);
          assert.deepInclude(going.body, {
            _tag: "WorkspaceBusy",
            workspaceId: from.id,
          });
          assert.lengthOf(yield* channelsOf(key, from.id), 1);

          // Once it ended, the channel moves.
          yield* sql`UPDATE publishing.publication_calls SET finished_at = now(), outcome = '{"_tag":"published"}'::jsonb WHERE idempotency_key = ${callKey}`;
          yield* sql`UPDATE publishing.posts SET status = 'finished' WHERE id = ${postId}`;

          const moved = yield* app.request(
            `/api/partner/workspaces/${from.id}/channels/${channelId}/move`,
            { body: { toWorkspaceId: to.id }, headers: bearer(key) }
          );

          assert.strictEqual(moved.status, 200);
        })
    );

    it.effect(
      "goes with the workspace it went to when that one is offboarded",
      () =>
        Effect.gen(function* offboarded() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const { home, owner } = yield* partnerOf("offboard");
          const { key } = yield* keyOf(owner, home);
          const from = yield* customerOf(key, "Offboard from");
          const to = yield* customerOf(key, "Offboard to");
          const channelId = yield* connectedIn(from.id, "@gone@social.example");

          const reply = yield* app.request(
            `/api/partner/workspaces/${from.id}/channels/${channelId}/move`,
            { body: { toWorkspaceId: to.id }, headers: bearer(key) }
          );

          const moved = yield* bodyOf(ChannelSchema, reply);

          const deleted = yield* app.request(
            `/api/partner/workspaces/${to.id}`,
            {
              headers: bearer(key),
              method: "DELETE",
            }
          );

          assert.strictEqual(deleted.status, 204);

          const left =
            yield* sql`SELECT id FROM channels.channels WHERE id IN (${channelId}, ${moved.id})`.pipe(
              Effect.flatMap(Schema.decodeUnknownEffect(IdsSchema))
            );

          assert.deepStrictEqual(left, []);
        })
    );
  }
);
