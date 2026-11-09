// Synthetic rows of the other contexts, written straight to their tables, so
// tests of what a workspace or an account holds need no platform, job or
// file: a channel, posts and their targets, a notice, assistant usage, and
// an OAuth client's grant.
import { randomUUID } from "node:crypto";

import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";

const IdRowsSchema = Schema.Array(Schema.Struct({ id: Schema.String }));

// Posts, targets, channels and notices have UUIDv7 ids: a random UUID with
// the version digit of v7 reads as one.
const newUuid7 = (): string => {
  const random = randomUUID();

  return `${random.slice(0, 14)}7${random.slice(15)}`;
};

const decodeIds = Schema.decodeUnknownEffect(IdRowsSchema);

// Rows as the SQL client returns them, read with a schema.
type Rows = readonly object[];

const firstId = (rows: Rows) =>
  decodeIds(rows).pipe(
    Effect.flatMap(([row]) =>
      row === undefined
        ? Effect.die(new Error("An insert returned no row"))
        : Effect.succeed(row.id)
    ),
    Effect.orDie
  );

/** A connected Mastodon account, with a synthetic encrypted token. */
export const seedChannel = Effect.fn("seedChannel")(function* seedChannel(
  workspaceId: string,
  handle: string
) {
  const sql = yield* SqlClient.SqlClient;

  return yield* firstId(
    yield* sql`INSERT INTO channels.channels (id, workspace_id, platform, account_id, handle, display_name, access_token, token_key_id, token_kind, scopes, status, refresh_needed, created_at, updated_at)
      VALUES (${newUuid7()}, ${workspaceId}, 'mastodon', ${randomUUID()}, ${handle}, 'Synthetic', 'synthetic.iv.ciphertext', 'synthetic', 'nonExpiring', '{}', 'active', false, now(), now())
      RETURNING id`
  );
});

/** A post in `status`, with a target on the channel. */
export const seedPost = Effect.fn("seedPost")(function* seedPost(
  workspaceId: string,
  channelId: string,
  text: string,
  status: "draft" | "finished" | "publishing" = "draft"
) {
  const sql = yield* SqlClient.SqlClient;

  const postId = yield* firstId(
    yield* sql`INSERT INTO publishing.posts (id, workspace_id, status, text)
      VALUES (${newUuid7()}, ${workspaceId}, ${status}, ${text})
      RETURNING id`
  );

  yield* sql`INSERT INTO publishing.post_targets (id, post_id, channel_id, status)
    VALUES (${newUuid7()}, ${postId}, ${channelId}, 'pending')`;

  return postId;
});

/** A notice for the user that a channel of the workspace needs them. */
export const seedNotice = Effect.fn("seedNotice")(function* seedNotice(
  userId: string,
  workspaceId: string,
  handle: string
) {
  const sql = yield* SqlClient.SqlClient;

  const event = JSON.stringify({
    _tag: "ChannelReconnectRequired",
    channel: { handle, platform: "mastodon" },
  });

  return yield* firstId(
    yield* sql`INSERT INTO notifications.notices (id, user_id, workspace_id, event, event_key, kind, email_status, created_at)
      VALUES (${newUuid7()}, ${userId}, ${workspaceId}, ${event}::jsonb, ${`seed:${randomUUID()}`}, 'ChannelReconnectRequired', 'none', now())
      RETURNING id`
  );
});

/** Requests the workspace sent the writing assistant one day. */
export const seedUsage = Effect.fn("seedUsage")(function* seedUsage(
  workspaceId: string,
  requests: number
) {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`INSERT INTO assistant.daily_usage (workspace_id, day, requests)
    VALUES (${workspaceId}, '2026-11-09', ${requests})`;
});

/**
 * An OAuth client the user let read the workspace, and a refresh token it
 * holds, as an MCP client signed in through the consent page would.
 */
export const seedOAuthGrant = Effect.fn("seedOAuthGrant")(
  function* seedOAuthGrant(userId: string, workspaceId: string, name: string) {
    const sql = yield* SqlClient.SqlClient;
    const clientId = `synthetic-${randomUUID()}`;

    yield* sql`INSERT INTO auth.oauth_client (client_id, name, uri, redirect_uris, created_at, updated_at)
      VALUES (${clientId}, ${name}, 'https://client.example.test', ARRAY['https://client.example.test/callback'], now(), now())`;

    yield* sql`INSERT INTO auth.oauth_consent (client_id, user_id, reference_id, scopes, created_at, updated_at)
      VALUES (${clientId}, ${userId}, ${workspaceId}, ARRAY['openid', 'workspace:read'], now(), now())`;

    yield* sql`INSERT INTO auth.oauth_refresh_token (token, client_id, user_id, reference_id, scopes, created_at, expires_at)
      VALUES (${`synthetic-${randomUUID()}`}, ${clientId}, ${userId}, ${workspaceId}, ARRAY['openid', 'offline_access', 'workspace:read'], now(), now() + interval '30 days')`;

    return clientId;
  }
);

/** How many rows a query counts, as `SELECT count(*)::int AS count`. */
export const countOf = (rows: Rows) =>
  Schema.decodeUnknownEffect(
    Schema.Array(Schema.Struct({ count: Schema.Number }))
  )(rows).pipe(
    Effect.map(([row]) => row?.count ?? 0),
    Effect.orDie
  );
