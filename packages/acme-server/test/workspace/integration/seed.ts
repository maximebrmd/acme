// Synthetic rows of the other contexts, written straight to their tables, so
// tests of what a workspace or an account holds need no platform, job or
// file: a channel, posts and their targets, a notice, assistant usage, a
// post analytics follows with a reading, a subscription as Stripe's webhook
// records it, and an OAuth client's grant.
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

/**
 * The accounts a Facebook sign-in reached, kept for the user to choose
 * among in the workspace, with synthetic encrypted tokens.
 */
export const seedConnectChoice = Effect.fn("seedConnectChoice")(
  function* seedConnectChoice(workspaceId: string, userId: string) {
    const sql = yield* SqlClient.SqlClient;

    yield* sql`INSERT INTO channels.connect_choices (selection_hash, workspace_id, started_by, platform, accounts, created_at, expires_at)
      VALUES (${randomUUID().replaceAll("-", "")}, ${workspaceId}, ${`user:${userId}`}, 'facebook', 'synthetic.iv.ciphertext', now(), now() + interval '15 minutes')`;
  }
);

/**
 * A connected account, Mastodon's unless `platform` says otherwise, with a
 * synthetic encrypted token; `refreshNeeded` asks for it to be reconnected.
 */
export const seedChannel = Effect.fn("seedChannel")(function* seedChannel(
  workspaceId: string,
  handle: string,
  {
    platform = "mastodon",
    refreshNeeded = false,
  }: { readonly platform?: string; readonly refreshNeeded?: boolean } = {}
) {
  const sql = yield* SqlClient.SqlClient;

  return yield* firstId(
    yield* sql`INSERT INTO channels.channels (id, workspace_id, platform, account_id, handle, display_name, access_token, token_key_id, token_kind, scopes, status, refresh_needed, created_at, updated_at)
      VALUES (${newUuid7()}, ${workspaceId}, ${platform}, ${randomUUID()}, ${handle}, 'Synthetic', 'synthetic.iv.ciphertext', 'synthetic', 'nonExpiring', '{}', ${refreshNeeded ? "refreshNeeded" : "active"}, ${refreshNeeded}, now(), now())
      RETURNING id`
  );
});

/** A platform's options on a target, as the column stores them. */
export type SeededOptions = Readonly<Record<string, boolean | string>>;

/**
 * A post in `status`, with a target on the channel, by `authorId` if any,
 * and the target's `options` (a platform's, as JSON) when given.
 */
export const seedPost = Effect.fn("seedPost")(function* seedPost(
  workspaceId: string,
  channelId: string,
  text: string,
  status: "draft" | "finished" | "publishing" = "draft",
  authorId: string | null = null,
  options: SeededOptions | null = null
) {
  const sql = yield* SqlClient.SqlClient;

  const postId = yield* firstId(
    yield* sql`INSERT INTO publishing.posts (id, workspace_id, status, text, author_id)
      VALUES (${newUuid7()}, ${workspaceId}, ${status}, ${text}, ${authorId})
      RETURNING id`
  );

  const stored = options === null ? null : JSON.stringify(options);

  yield* sql`INSERT INTO publishing.post_targets (id, post_id, channel_id, status, options)
    VALUES (${newUuid7()}, ${postId}, ${channelId}, 'pending', ${stored}::jsonb)`;

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
 * A post of the workspace that analytics follows on the channel, with one
 * reading of its counts.
 */
export const seedTrackedPost = Effect.fn("seedTrackedPost")(
  function* seedTrackedPost(
    workspaceId: string,
    channelId: string,
    postId: string
  ) {
    const sql = yield* SqlClient.SqlClient;
    const targetId = newUuid7();

    yield* sql`INSERT INTO analytics.tracked_posts (target_id, post_id, workspace_id, channel_id, platform_post_id, published_at, next_collection_at, likes, reposts, replies, last_collected_at)
      VALUES (${targetId}, ${postId}, ${workspaceId}, ${channelId}, ${`synthetic-${randomUUID()}`}, '2026-11-08T09:00:00Z', '2026-11-09T09:00:00Z', 4, 2, 1, '2026-11-08T10:00:00Z')`;

    yield* sql`INSERT INTO analytics.metric_snapshots (target_id, collected_at, likes, reposts, replies)
      VALUES (${targetId}, '2026-11-08T10:00:00Z', 4, 2, 1)`;

    return targetId;
  }
);

/**
 * A Stripe subscription of the workspace in `status`, as billing and Better
 * Auth's Stripe plugin each record it, with synthetic Stripe ids.
 */
export const seedSubscription = Effect.fn("seedSubscription")(
  function* seedSubscription(workspaceId: string, status: string) {
    const sql = yield* SqlClient.SqlClient;
    const run = randomUUID().replaceAll("-", "");

    yield* sql`INSERT INTO billing.subscriptions (stripe_subscription_id, stripe_customer_id, workspace_id, plan, status, cancel_at_period_end, last_event_at, last_event_id, updated_at)
      VALUES (${`sub_${run}`}, ${`cus_${run}`}, ${workspaceId}, 'pro', ${status}, false, now(), ${`evt_${run}`}, now())`;

    yield* sql`INSERT INTO auth.subscription (plan, reference_id, stripe_customer_id, stripe_subscription_id, status)
      VALUES ('pro', ${workspaceId}, ${`cus_${run}`}, ${`sub_${run}`}, ${status})`;
  }
);

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
