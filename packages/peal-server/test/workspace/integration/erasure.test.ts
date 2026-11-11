// Every table the migrations create, and what deleting a workspace or closing
// an account does to its rows: each table either names a workspace or a user
// (then nothing of theirs is left, or the row stays without them), or names
// nobody and stays on purpose, for a reason given here. A new table fails the
// first test until it says which.
import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import {
  MigratedSqlLive,
  apiKeyOf,
  bodyOf,
  password,
  signedUp,
  TestApp,
  workspaceOf,
} from "./harness.ts";
import type { Person } from "./harness.ts";
import {
  countOf,
  seedChannel,
  seedConnectChoice,
  seedNotice,
  seedOAuthGrant,
  seedPost,
  seedSubscription,
  seedTrackedPost,
  seedUsage,
} from "./seed.ts";

// How many rows of a table still name the workspace, or the user.
type Count = (
  sql: SqlClient.SqlClient,
  id: string
) => Effect.Effect<readonly object[], unknown>;

const count = (rows: ReturnType<Count>) =>
  rows.pipe(Effect.orDie, Effect.flatMap(countOf));

// The schemas the migrations create. Effect's cluster tables, in `public`,
// hold the jobs' payloads (ids), and are not the migrations'.
const schemas = [
  "activity",
  "ads",
  "analytics",
  "assistant",
  "auth",
  "billing",
  "channels",
  "engagement",
  "legal",
  "media",
  "notifications",
  "publishing",
  "review",
  "staff",
  "webhooks",
  "workspace",
];

// The rows of each table that name a workspace: none may be left once it is
// deleted.
const workspaceRows = {
  // The log of who changed what in it.
  "activity.events": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM activity.events WHERE workspace_id = ${id}`,
  // Its sign-ins to ad networks with their tokens, its ad accounts, what
  // was read of them, its boosts, their journal and the audit trail.
  "ads.accounts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM ads.accounts WHERE workspace_id = ${id}`,
  "ads.ad_sets": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM ads.ad_sets WHERE workspace_id = ${id}`,
  "ads.ads": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM ads.ads WHERE workspace_id = ${id}`,
  "ads.audit_events": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM ads.audit_events WHERE workspace_id = ${id}`,
  "ads.boosts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM ads.boosts WHERE workspace_id = ${id}`,
  "ads.campaigns": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM ads.campaigns WHERE workspace_id = ${id}`,
  "ads.grants": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM ads.grants WHERE workspace_id = ${id}`,
  "ads.insight_days": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM ads.insight_days WHERE workspace_id = ${id}`,
  "ads.sign_in_attempts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM ads.sign_in_attempts WHERE workspace_id = ${id}`,
  "ads.spend_calls": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM ads.spend_calls WHERE workspace_id = ${id}`,
  "analytics.account_snapshots": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM analytics.account_snapshots s JOIN analytics.tracked_channels c ON c.channel_id = s.channel_id WHERE c.workspace_id = ${id}`,
  "analytics.metric_snapshots": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM analytics.metric_snapshots s JOIN analytics.tracked_posts t ON t.target_id = s.target_id WHERE t.workspace_id = ${id}`,
  "analytics.paid_reads": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM analytics.paid_reads WHERE workspace_id = ${id}`,
  "analytics.tracked_channels": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM analytics.tracked_channels WHERE workspace_id = ${id}`,
  "analytics.tracked_posts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM analytics.tracked_posts WHERE workspace_id = ${id}`,
  "assistant.daily_usage": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM assistant.daily_usage WHERE workspace_id = ${id}`,
  "auth.apikey": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.apikey WHERE reference_id = ${id}`,
  "auth.invitation": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.invitation WHERE organization_id = ${id}`,
  "auth.member": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.member WHERE organization_id = ${id}`,
  "auth.oauth_access_token": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.oauth_access_token WHERE reference_id = ${id}`,
  "auth.oauth_consent": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.oauth_consent WHERE reference_id = ${id}`,
  "auth.oauth_refresh_token": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.oauth_refresh_token WHERE reference_id = ${id}`,
  "auth.organization": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.organization WHERE id = ${id}`,
  // The workspace a session last opened; the session itself is its user's.
  "auth.session": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.session WHERE active_organization_id = ${id}`,
  "auth.subscription": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.subscription WHERE reference_id = ${id}`,
  // Its contract numbers find nothing more.
  "billing.contract_references": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.contract_references WHERE workspace_id = ${id}`,
  // Requests to cancel or withdraw stay without the workspace, as its
  // orders do.
  "billing.contract_requests": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.contract_requests WHERE workspace_id = ${id}`,
  "billing.metered_posts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.metered_posts WHERE workspace_id = ${id}`,
  "billing.orders": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.orders WHERE workspace_id = ${id}`,
  "billing.subscriptions": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.subscriptions WHERE workspace_id = ${id}`,
  // A trial an account started stays, without the workspace, so the
  // account starts no second one.
  "billing.trials": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.trials WHERE workspace_id = ${id}`,
  "billing.usage_days": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.usage_days WHERE workspace_id = ${id}`,
  "billing.withdrawals": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.withdrawals WHERE workspace_id = ${id}`,
  "channels.channels": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM channels.channels WHERE workspace_id = ${id}`,
  "channels.connect_attempts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM channels.connect_attempts WHERE workspace_id = ${id}`,
  "channels.connect_choices": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM channels.connect_choices WHERE workspace_id = ${id}`,
  "channels.connect_links": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM channels.connect_links WHERE workspace_id = ${id}`,
  // What other people wrote under the workspace's posts goes with it, as
  // do the replies sent to them.
  "engagement.comments": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM engagement.comments WHERE workspace_id = ${id}`,
  "engagement.replies": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM engagement.replies WHERE workspace_id = ${id}`,
  "engagement.threads": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM engagement.threads WHERE workspace_id = ${id}`,
  "media.media_assets": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM media.media_assets WHERE workspace_id = ${id}`,
  "notifications.notices": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM notifications.notices WHERE workspace_id = ${id}`,
  "publishing.channel_defaults": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM publishing.channel_defaults WHERE workspace_id = ${id}`,
  "publishing.channel_sets": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM publishing.channel_sets WHERE workspace_id = ${id}`,
  "publishing.idempotency_keys": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM publishing.idempotency_keys WHERE workspace_id = ${id}`,
  "publishing.post_targets": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM publishing.post_targets t JOIN publishing.posts p ON p.id = t.post_id WHERE p.workspace_id = ${id}`,
  "publishing.posts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM publishing.posts WHERE workspace_id = ${id}`,
  "publishing.publication_attempts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM publishing.publication_attempts a JOIN publishing.post_targets t ON t.id = a.target_id JOIN publishing.posts p ON p.id = t.post_id WHERE p.workspace_id = ${id}`,
  "publishing.publication_calls": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM publishing.publication_calls c JOIN publishing.post_targets t ON t.id = c.target_id JOIN publishing.posts p ON p.id = t.post_id WHERE p.workspace_id = ${id}`,
  "publishing.signatures": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM publishing.signatures WHERE workspace_id = ${id}`,
  "publishing.tags": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM publishing.tags WHERE workspace_id = ${id}`,
  "publishing.upload_sessions": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM publishing.upload_sessions u JOIN publishing.publication_calls c ON c.idempotency_key = u.idempotency_key JOIN publishing.post_targets t ON t.id = c.target_id JOIN publishing.posts p ON p.id = t.post_id WHERE p.workspace_id = ${id}`,
  "review.approval_requests": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM review.approval_requests WHERE workspace_id = ${id}`,
  "review.comments": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM review.comments WHERE workspace_id = ${id}`,
  "review.links": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM review.links WHERE workspace_id = ${id}`,
  "review.settings": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM review.settings WHERE workspace_id = ${id}`,
  "webhooks.deliveries": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM webhooks.deliveries WHERE workspace_id = ${id}`,
  "webhooks.endpoints": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM webhooks.endpoints WHERE workspace_id = ${id}`,
  "webhooks.events": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM webhooks.events WHERE workspace_id = ${id}`,
  "webhooks.manual_sends": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM webhooks.manual_sends WHERE workspace_id = ${id}`,
  // A partner account goes with its home workspace, and with it its keys,
  // its creations' idempotency keys and its daily counts.
  "workspace.partner_idempotency_keys": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM workspace.partner_idempotency_keys k JOIN workspace.partners p ON p.id = k.partner_id WHERE p.workspace_id = ${id}`,
  "workspace.partner_keys": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM workspace.partner_keys k JOIN workspace.partners p ON p.id = k.partner_id WHERE p.workspace_id = ${id}`,
  "workspace.partner_usage_days": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM workspace.partner_usage_days d JOIN workspace.partners p ON p.id = d.partner_id WHERE p.workspace_id = ${id}`,
  "workspace.partners": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM workspace.partners WHERE workspace_id = ${id}`,
} satisfies Readonly<Record<string, Count>>;

// The tables whose rows go with a workspace a partner owns, which has no
// member to delete it: `partners.test.ts` offboards one, and counts them.
const offboardedRows = ["workspace.partner_workspaces"];

// The rows of each table that name a user: none may be left once their
// account is closed. Posts stay with their workspaces, without an author.
const userRows = {
  // What they changed in the workspaces that remain stays in those
  // workspaces' logs, without them; their id leaves the ids other events
  // name.
  "activity.events": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM activity.events
      WHERE user_id = ${id}
        OR EXISTS (SELECT 1 FROM jsonb_each_text(object_ids) AS named(name, value) WHERE value = ${id})`,
  // What stays with the workspaces a closed account shared, without its
  // id: the ad accounts it connected and allowed to spend, the sign-ins
  // it made, the boosts it asked for, and the audit trail's lines.
  "ads.accounts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM ads.accounts WHERE connected_by = ${id} OR authorized_by = ${id}`,
  "ads.audit_events": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM ads.audit_events WHERE by_id = ${id}`,
  "ads.boosts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM ads.boosts WHERE requested_by_id = ${id}`,
  "ads.grants": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM ads.grants WHERE granted_by = ${id}`,
  "ads.sign_in_attempts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM ads.sign_in_attempts WHERE started_by = ${id}`,
  "auth.account": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.account WHERE user_id = ${id}`,
  "auth.device_code": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.device_code WHERE user_id = ${id}`,
  "auth.invitation": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.invitation i WHERE i.inviter_id = ${id} OR lower(i.email) IN (SELECT lower(email) FROM auth."user" WHERE id = ${id})`,
  "auth.member": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.member WHERE user_id = ${id}`,
  "auth.oauth_access_token": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.oauth_access_token WHERE user_id = ${id}`,
  "auth.oauth_client": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.oauth_client WHERE user_id = ${id}`,
  "auth.oauth_consent": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.oauth_consent WHERE user_id = ${id}`,
  "auth.oauth_refresh_token": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.oauth_refresh_token WHERE user_id = ${id}`,
  // Their own sessions, and those they opened as staff to act as someone.
  "auth.session": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.session WHERE user_id = ${id} OR impersonated_by = ${id}`,
  "auth.subscription": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.subscription WHERE reference_id = ${id}`,
  "auth.user": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth."user" WHERE id = ${id}`,
  // Password reset tokens hold their user's id.
  "auth.verification": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.verification WHERE value = ${id}`,
  // Orders, trials, withdrawals and requests to cancel or withdraw stay
  // with their workspaces, without the user, nor, for requests, the name
  // and the address they wrote.
  "billing.contract_requests": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.contract_requests WHERE user_id = ${id}`,
  "billing.orders": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.orders WHERE user_id = ${id}`,
  "billing.trials": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.trials WHERE user_id = ${id}`,
  "billing.withdrawals": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.withdrawals WHERE user_id = ${id}`,
  "channels.connect_attempts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM channels.connect_attempts WHERE started_by = ${`user:${id}`}`,
  "channels.connect_choices": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM channels.connect_choices WHERE started_by = ${`user:${id}`}`,
  // The links they created stay their workspaces', without them.
  "channels.connect_links": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM channels.connect_links WHERE created_by = ${`user:${id}`}`,
  // The replies they sent, and the threads of the posts they wrote, stay
  // with the workspace, without them.
  "engagement.replies": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM engagement.replies WHERE author_id = ${id}`,
  "engagement.threads": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM engagement.threads WHERE author_id = ${id}`,
  "notifications.notices": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM notifications.notices WHERE user_id = ${id}`,
  "notifications.notification_preferences": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM notifications.notification_preferences WHERE user_id = ${id}`,
  // Their posts stay with the workspace, without who wrote or scheduled
  // them.
  "publishing.posts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM publishing.posts WHERE author_id = ${id} OR scheduled_by = ${id}`,
  // What they wrote and decided in reviews stays with its workspace,
  // without them, as do the links and the policy they made.
  "review.approval_requests": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM review.approval_requests WHERE requested_by = ${id} OR decided_by_user_id = ${id}`,
  "review.comments": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM review.comments WHERE author_user_id = ${id} OR resolved_by_user_id = ${id}`,
  "review.links": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM review.links WHERE created_by = ${id}`,
  "review.settings": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM review.settings WHERE updated_by = ${id}`,
  // What staff did to them: the events stay, without them and without the
  // reason given about them. What they did as staff keeps their id (below).
  // An id the user is named by in a change staff made as someone else goes
  // too.
  "staff.audit_events": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM staff.audit_events
      WHERE target_id = ${id}
        OR EXISTS (SELECT 1 FROM jsonb_each_text(object_ids) AS named(name, value) WHERE value = ${id})`,
  // The partner keys they created stay their partner's, without them.
  "workspace.partner_keys": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM workspace.partner_keys WHERE created_by = ${id}`,
} satisfies Readonly<Record<string, Count>>;

// The rows of each table that the law has Peal keep about a user once
// their account closes, apart from everything else (loi n° 2004-575,
// art. 6, V, A; décret n° 2021-1362): who held the account, and each
// connection that made content, the workspace's included. Each is kept for
// its period, then purged (`#legal/domain/legal-retention.ts`).
const heldRows = {
  "legal.connections": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM legal.connections WHERE user_id = ${id}`,
  "legal.identification_holds": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM legal.identification_holds WHERE user_id = ${id}`,
} satisfies Readonly<Record<string, Count>>;

// Tables that name neither a workspace nor a user, and why they stay.
const kept = {
  "activity.request_counts":
    "how many requests a credential sent in a window, by a digest that names nobody, kept an hour",
  "analytics.erased_workspaces":
    "the ids of erased workspaces, so posts listed before are never followed after",
  "auth.jwks": "the server's keys that sign OAuth access tokens",
  "auth.oauth_client":
    "clients registered by the server or by themselves, which no user owns (those a user registered are theirs, above)",
  "auth.oauth_client_assertion":
    "the ids of client assertions already used, until they expire",
  "auth.oauth_client_resource": "which resources each client may ask for",
  "auth.oauth_resource": "the APIs the server issues tokens for",
  "auth.rate_limit":
    "request counts by address and path, which no account names, kept a minute",
  "auth.verification":
    "codes and tokens that expire within minutes (a password reset names its user, above)",
  "billing.stripe_events":
    "the ids of Stripe events already recorded, so none is recorded twice",
  "channels.data_deletions":
    "the codes and counts of Meta's deletion requests, which name nobody",
  "channels.mastodon_apps": "Peal's own app on each Mastodon instance",
  "engagement.erased_workspaces":
    "the ids of erased workspaces, so their posts' comments are never read after",
  "legal.disclosures":
    "what staff handed over on legal requests, and on what grounds, kept 5 years",
  "notifications.sent_notices":
    "the keys of events already told, ids and instants only",
  "publishing.quota_usage":
    "the units of a platform's daily quota the server spent, by day",
} satisfies Readonly<Record<string, string>>;

const TablesSchema = Schema.Array(Schema.Struct({ name: Schema.String }));

// A random UUID with the version digit of v7 reads as one.
const uuid7 = (): string => {
  const random = randomUUID();

  return `${random.slice(0, 14)}7${random.slice(15)}`;
};

const IdsSchema = Schema.Array(Schema.Struct({ id: Schema.String }));

/** Invites `guest` to the workspace with `role`; they accept. */
const join = Effect.fn("join")(function* join(
  owner: Person,
  workspaceId: string,
  guest: Person,
  role: string
) {
  const app = yield* TestApp;

  const invited = yield* app.request("/api/auth/organization/invite-member", {
    body: { email: guest.email, organizationId: workspaceId, role },
    headers: { cookie: owner.cookies },
  });

  yield* app.request("/api/auth/organization/accept-invitation", {
    body: {
      invitationId: (yield* bodyOf(
        Schema.Struct({ id: Schema.String }),
        invited
      )).id,
    },
    headers: { cookie: guest.cookies },
  });
});

/**
 * A row in every table a workspace's content and its people's records go
 * to, written as each context writes them: what a workspace holds besides
 * its members (`content`), and what a user does in it (`person`).
 */
const fill = Effect.fn("fill")(function* fill(
  workspaceId: string,
  person: Person
) {
  const app = yield* TestApp;
  const sql = yield* SqlClient.SqlClient;
  const channelId = yield* seedChannel(workspaceId, "@erasure@social.example");

  const postId = yield* seedPost(
    workspaceId,
    channelId,
    "A synthetic post of the erasure test.",
    "finished",
    person.id
  );

  // As a post the person scheduled in the web app keeps it.
  yield* sql`UPDATE publishing.posts SET created_via = '{"_tag":"web"}'::jsonb, scheduled_via = '{"_tag":"web"}'::jsonb, scheduled_by = ${person.id} WHERE id = ${postId}`;

  // A tag the post is filed under.
  const tagId = uuid7();

  yield* sql`INSERT INTO publishing.tags (id, workspace_id, name, name_key, colour, created_at)
    VALUES (${tagId}, ${workspaceId}, 'Synthetic', 'synthetic', 'blue', now())`;

  yield* sql`UPDATE publishing.posts SET tag_ids = ARRAY[${tagId}]::uuid[] WHERE id = ${postId}`;

  // What the workspace saved to write its posts.
  yield* sql`INSERT INTO publishing.signatures (id, workspace_id, name, name_key, text, scope, is_default, created_at)
    VALUES (${uuid7()}, ${workspaceId}, 'Synthetic', 'synthetic', 'A synthetic signature', 'workspace', true, now())`;

  const savedChannel = uuid7();

  yield* sql`INSERT INTO publishing.channel_sets (id, workspace_id, name, name_key, channel_ids, options, created_at)
    VALUES (${uuid7()}, ${workspaceId}, 'Synthetic', 'synthetic', ARRAY[${savedChannel}]::uuid[], '[]'::jsonb, now())`;

  yield* sql`INSERT INTO publishing.channel_defaults (channel_id, workspace_id, options, updated_at)
    VALUES (${savedChannel}, ${workspaceId}, '{"platform":"youtube"}'::jsonb, now())`;

  // The key of the request that made it, as `posts.send` keeps it.
  yield* sql`INSERT INTO publishing.idempotency_keys (workspace_id, key_digest, request_digest, post_id, created_at)
    VALUES (${workspaceId}, ${randomUUID()}, 'synthetic-digest', ${postId}, now())`;

  const [target] =
    yield* sql`SELECT id FROM publishing.post_targets WHERE post_id = ${postId}`.pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(IdsSchema)),
      Effect.orDie
    );

  const targetId = target?.id ?? "";

  yield* sql`INSERT INTO publishing.publication_attempts (target_id, round, attempt, decision, detail, outcome, started_at, finished_at)
    VALUES (${targetId}, 1, 1, 'settle', '{}'::jsonb, 'published', now(), now())`;

  const callKey = randomUUID();

  yield* sql`INSERT INTO publishing.publication_calls (idempotency_key, target_id, round, attempt, operation, started_at)
    VALUES (${callKey}, ${targetId}, 1, 1, 'publish', now())`;

  yield* sql`INSERT INTO publishing.upload_sessions (idempotency_key, byte_size, opened_at, video_id)
    VALUES (${callKey}, 2048, now(), 'synthetic-video')`;

  // The post's review: the policy the user chose, a link they made, a
  // comment they wrote and resolved, a visitor's with a name and an
  // address, and an approval they asked for and decided.
  const linkId = uuid7();

  yield* sql`INSERT INTO review.settings (workspace_id, approval_policy, updated_at, updated_by)
    VALUES (${workspaceId}, 'always', now(), ${person.id})`;

  yield* sql`INSERT INTO review.links (id, workspace_id, post_id, token_hash, access, created_by, created_at, expires_at)
    VALUES (${linkId}, ${workspaceId}, ${postId}, ${randomUUID().replaceAll("-", "")}, 'approve', ${person.id}, now(), now() + interval '14 days')`;

  yield* sql`INSERT INTO review.comments (id, workspace_id, post_id, author_kind, author_user_id, body, created_at, resolved_at, resolved_by_kind, resolved_by_user_id)
    VALUES (${uuid7()}, ${workspaceId}, ${postId}, 'member', ${person.id}, 'A synthetic comment.', now(), now(), 'member', ${person.id})`;

  yield* sql`INSERT INTO review.comments (id, workspace_id, post_id, author_kind, author_link_id, visitor_name, body, created_at)
    VALUES (${uuid7()}, ${workspaceId}, ${postId}, 'visitor', ${linkId}, 'A synthetic reviewer', 'A synthetic comment.', now())`;

  yield* sql`INSERT INTO review.approval_requests (id, workspace_id, post_id, subject_hash, requested_by, requested_via, requested_at, scheduled_at, schedule_zone, status, decided_at, decided_by_kind, decided_by_user_id)
    VALUES (${uuid7()}, ${workspaceId}, ${postId}, 'synthetic', ${person.id}, 'member', now(), now(), 'Europe/Paris', 'approved', now(), 'member', ${person.id})`;

  yield* seedTrackedPost(workspaceId, channelId, postId);

  // The channel's account, followed and read for a day.
  yield* sql`INSERT INTO analytics.tracked_channels (channel_id, workspace_id, platform, next_collection_at)
    VALUES (${channelId}, ${workspaceId}, 'mastodon', now())`;
  yield* sql`INSERT INTO analytics.account_snapshots (channel_id, day, collected_at, followers)
    VALUES (${channelId}, current_date, now(), 12)`;

  // A post read on a platform that bills reads, counted for the day.
  yield* sql`INSERT INTO analytics.paid_reads (workspace_id, platform, day, resource)
    VALUES (${workspaceId}, 'x', current_date, '1800000000000000001')`;
  yield* seedUsage(workspaceId, 2);
  yield* seedSubscription(workspaceId, "canceled");

  yield* sql`INSERT INTO billing.metered_posts (workspace_id, platform, month, posts, posts_with_links)
    VALUES (${workspaceId}, 'x', date_trunc('month', now())::date, 2, 1)`;
  yield* sql`INSERT INTO billing.usage_days (workspace_id, day, meter, dimension, quantity)
    VALUES (${workspaceId}, current_date, 'publishedPosts', 'x', 2), (${workspaceId}, current_date, 'channels', '', 1)`;
  // An order with its consent, a trial (one per account: the user's
  // first workspace has it) and a withdrawal.
  yield* sql`INSERT INTO billing.orders (id, workspace_id, user_id, plan, interval, trial, consent_version, created_at)
    VALUES (${uuid7()}, ${workspaceId}, ${person.id}, 'pro', 'month', true, '2026-11-09', now())`;

  yield* sql`INSERT INTO billing.trials (stripe_subscription_id, workspace_id, user_id, plan, started_at, reserved_at)
    VALUES (${`sub_${randomUUID()}`}, ${workspaceId}, (SELECT CASE WHEN EXISTS (SELECT 1 FROM billing.trials WHERE user_id = ${person.id}) THEN NULL ELSE ${person.id} END), 'pro', now(), now())`;

  yield* sql`INSERT INTO billing.withdrawals (stripe_subscription_id, workspace_id, user_id, refunded, currency, requested_at)
    VALUES (${`sub_${randomUUID()}`}, ${workspaceId}, ${person.id}, 0, 'eur', now())`;

  // A request to cancel, from the form, tied to the workspace, and the
  // contract number that found it.
  yield* sql`INSERT INTO billing.contract_requests (id, kind, channel, status, acknowledgement, locale, name, email, received_at, user_id, workspace_id)
    VALUES (${uuid7()}, 'cancellation', 'form', 'applied', 'sent', 'en', 'Synthetic Holder', ${person.email}, now(), ${person.id}, ${workspaceId})`;

  yield* sql`INSERT INTO billing.contract_references (reference, stripe_subscription_id, workspace_id, issued_at)
    VALUES (${randomUUID()}, ${`sub_${randomUUID()}`}, ${workspaceId}, now())`;

  yield* sql`INSERT INTO media.media_assets (id, workspace_id, storage_key, content_type, byte_size, status, created_at, updated_at)
    VALUES (${randomUUID()}, ${workspaceId}, ${`media/${workspaceId}/${randomUUID()}.png`}, 'image/png', 128, 'pending', now(), now())`;

  yield* apiKeyOf(person, workspaceId, ["post:read"]);

  // A connection that made content in the workspace.
  yield* sql`INSERT INTO legal.connections (id, access, at, protocol, user_id, workspace_id)
    VALUES (${uuid7()}, 'session', now(), 'https', ${person.id}, ${workspaceId})`;
  yield* seedOAuthGrant(person.id, workspaceId, "Synthetic erasure client");
  yield* seedConnectChoice(workspaceId, person.id);
  yield* seedNotice(person.id, workspaceId, "@erasure@social.example");

  // A thread under a post the person wrote, with someone's comment and
  // the reply the person sent to it.
  const threadId = uuid7();
  const commentId = uuid7();

  yield* sql`INSERT INTO engagement.threads (id, workspace_id, channel_id, target_id, post_id, platform_post_id, published_at, next_collection_at, author_id, comment_count, unanswered_count, last_comment_at)
    VALUES (${threadId}, ${workspaceId}, ${uuid7()}, ${uuid7()}, ${uuid7()}, '113000000000000001', now(), now(), ${person.id}, 1, 0, now())`;

  yield* sql`INSERT INTO engagement.comments (id, thread_id, workspace_id, channel_id, platform_comment_id, author_platform_id, author_handle, author_display_name, text, written_at, received_at, state)
    VALUES (${commentId}, ${threadId}, ${workspaceId}, ${uuid7()}, '113000000000000002', '7001', 'reader@social.example', 'A synthetic reader', 'A synthetic comment', now(), now(), 'answered')`;

  yield* sql`INSERT INTO engagement.replies (id, thread_id, comment_id, workspace_id, channel_id, author_id, text, created_at, status, settled_at)
    VALUES (${uuid7()}, ${threadId}, ${commentId}, ${workspaceId}, ${uuid7()}, ${person.id}, 'A synthetic reply', now(), 'sent', now())`;
  // A sign-in to an ad network, an ad account it connects that an owner
  // allowed to spend, what was read of it, a boost that was stopped with
  // its journal, and the audit trail's line of it.
  const grantId = uuid7();
  const adAccountId = uuid7();
  const boostId = uuid7();

  yield* sql`INSERT INTO ads.sign_in_attempts (state_hash, workspace_id, network, started_by, expires_at)
    VALUES (${uuid7()}, ${workspaceId}, 'meta', ${person.id}, now() + interval '15 minutes')`;

  yield* sql`INSERT INTO ads.grants (id, workspace_id, network, platform_user_id, token, token_key_id, scopes, access, granted_by, created_at, updated_at)
    VALUES (${grantId}, ${workspaceId}, 'meta', ${uuid7()}, 'synthetic.iv.ciphertext', 'synthetic', ARRAY['ads_read'], 'working', ${person.id}, now(), now())`;

  yield* sql`INSERT INTO ads.accounts (id, workspace_id, grant_id, network, external_id, name, currency, time_zone, status, connected_by, connected_at, next_sync_at, spending_enabled, monthly_ceiling, authorized_by, authorized_at)
    VALUES (${adAccountId}, ${workspaceId}, ${grantId}, 'meta', '1001', 'Synthetic account', 'EUR', 'Europe/Paris', 'active', ${person.id}, now(), now() + interval '1 day', true, 10000, ${person.id}, now())`;

  yield* sql`INSERT INTO ads.campaigns (account_id, workspace_id, external_id, name, status, raw_status, objective, synced_at)
    VALUES (${adAccountId}, ${workspaceId}, '2001', 'Synthetic campaign', 'active', 'ACTIVE', 'engagement', now())`;

  yield* sql`INSERT INTO ads.ad_sets (account_id, workspace_id, external_id, campaign_external_id, name, status, raw_status, synced_at)
    VALUES (${adAccountId}, ${workspaceId}, '3001', '2001', 'Synthetic ad set', 'active', 'ACTIVE', now())`;

  yield* sql`INSERT INTO ads.ads (account_id, workspace_id, external_id, ad_set_external_id, campaign_external_id, name, status, raw_status, synced_at)
    VALUES (${adAccountId}, ${workspaceId}, '4001', '3001', '2001', 'Synthetic ad', 'active', 'ACTIVE', now())`;

  yield* sql`INSERT INTO ads.insight_days (account_id, workspace_id, ad_external_id, day, spend, impressions, reach, clicks)
    VALUES (${adAccountId}, ${workspaceId}, '4001', current_date, 1250, 1000, 800, 12)`;

  yield* sql`INSERT INTO ads.boosts (id, workspace_id, account_id, account_network, account_external_id, channel_id, post_id, target_id, platform, objective, audience, budget_kind, budget_amount, committed, currency, starts_at, ends_at, state, state_at, idempotency_key, requested_by_kind, requested_by_id, created_at, updated_at)
    VALUES (${boostId}, ${workspaceId}, ${adAccountId}, 'meta', '1001', ${uuid7()}, ${uuid7()}, ${uuid7()}, 'facebook', 'engagement', ${JSON.stringify({ ageMax: 65, ageMin: 18, countries: ["US"] })}::jsonb, 'total', 5000, 5000, 'EUR', now() - interval '2 days', now() + interval '5 days', 'stopped', now(), ${uuid7()}, 'user', ${person.id}, now(), now())`;

  yield* sql`INSERT INTO ads.spend_calls (id, workspace_id, boost_id, step, started_at, finished_at, outcome)
    VALUES (${uuid7()}, ${workspaceId}, ${boostId}, 'createCampaign', now(), now(), 'done')`;

  yield* sql`INSERT INTO ads.audit_events (id, workspace_id, account_id, boost_id, action, amounts, at, by_kind, by_id, currency)
    VALUES (${uuid7()}, ${workspaceId}, ${adAccountId}, ${boostId}, 'boostRequested', ${JSON.stringify({ budget: 5000 })}::jsonb, now(), 'user', ${person.id}, 'EUR')`;

  // A webhook endpoint, with an event on its way to it.
  const endpointId = uuid7();
  const eventId = uuid7();

  yield* sql`INSERT INTO webhooks.endpoints (id, workspace_id, url, description, event_types, status, secret, created_at, updated_at)
    VALUES (${endpointId}, ${workspaceId}, 'https://hooks.example.com/erasure', '', ARRAY['post.published'], 'enabled', 'synthetic.iv.ciphertext', now(), now())`;

  yield* sql`INSERT INTO webhooks.events (id, workspace_id, type, key, data, occurred_at)
    VALUES (${eventId}, ${workspaceId}, 'webhook.test', ${`webhook-test:${eventId}`}, ${JSON.stringify({ endpointId, workspaceId })}::jsonb, now())`;

  yield* sql`INSERT INTO webhooks.deliveries (id, endpoint_id, event_id, workspace_id, event_type, status, attempts, created_at)
    VALUES (${uuid7()}, ${endpointId}, ${eventId}, ${workspaceId}, 'webhook.test', 'pending', 0, now())`;

  // The hour's count of the test events sent by hand.
  yield* sql`INSERT INTO webhooks.manual_sends (workspace_id, kind, window_start, sent)
    VALUES (${workspaceId}, 'single', date_trunc('hour', now()), 1)`;

  // A connect link the person created, not yet used.
  yield* sql`INSERT INTO channels.connect_links (id, workspace_id, platform, channel_ids, token_digest, created_by, starts, status, created_at, expires_at)
    VALUES (${uuid7()}, ${workspaceId}, 'mastodon', '{}', ${randomUUID()}, ${`user:${person.id}`}, 0, 'pending', now(), now() + interval '7 days')`;

  // A partner account, with a key the person created, a creation's
  // idempotency key and a day's count.
  const partnerId = uuid7();

  yield* sql`INSERT INTO workspace.partners (id, workspace_id, name, return_origins, created_at, updated_at)
    VALUES (${partnerId}, ${workspaceId}, 'Synthetic partner', ARRAY['https://app.example.test'], now(), now())`;

  yield* sql`INSERT INTO workspace.partner_keys (id, partner_id, name, key_digest, start, scopes, permissions, created_by, created_at)
    VALUES (${uuid7()}, ${partnerId}, 'Synthetic key', ${randomUUID()}, 'peal_partner_synt', ARRAY['workspaces:read'], ARRAY['post:read'], ${person.id}, now())`;

  yield* sql`INSERT INTO workspace.partner_idempotency_keys (partner_id, key_digest, request_digest, workspace_id, created_at)
    VALUES (${partnerId}, ${randomUUID()}, ${randomUUID()}, ${randomUUID()}, now())`;

  yield* sql`INSERT INTO workspace.partner_usage_days (partner_id, day, workspaces, channels)
    VALUES (${partnerId}, '2026-11-09', 0, 1)`;

  yield* sql`INSERT INTO channels.connect_attempts (state_hash, workspace_id, started_by, platform, secret, created_at, expires_at)
    VALUES (${randomUUID().replaceAll("-", "")}, ${workspaceId}, ${`user:${person.id}`}, 'mastodon', 'synthetic.iv.ciphertext', now(), now() + interval '15 minutes')`;

  yield* sql`INSERT INTO auth.oauth_access_token (token, client_id, user_id, reference_id, scopes, created_at, expires_at)
    SELECT ${`synthetic-${randomUUID()}`}, client_id, user_id, reference_id, ARRAY['workspace:read'], now(), now() + interval '15 minutes'
    FROM auth.oauth_consent WHERE user_id = ${person.id} AND reference_id = ${workspaceId}`;

  yield* app.request("/api/auth/organization/invite-member", {
    body: {
      email: `pending+${randomUUID()}@example.test`,
      organizationId: workspaceId,
      role: "viewer",
    },
    headers: { cookie: person.cookies },
  });

  yield* app.request("/api/auth/organization/set-active", {
    body: { organizationId: workspaceId },
    headers: { cookie: person.cookies },
  });
});

/** What only the user holds: their own records outside any workspace. */
const fillPerson = Effect.fn("fillPerson")(function* fillPerson(
  person: Person
) {
  const app = yield* TestApp;
  const sql = yield* SqlClient.SqlClient;

  yield* app.request("/api/me/notification-preferences", {
    body: { everyPost: true },
    headers: { cookie: person.cookies },
    method: "PATCH",
  });

  yield* sql`INSERT INTO auth.device_code (device_code, user_code, user_id, expires_at, status)
    VALUES (${randomUUID()}, ${randomUUID().slice(0, 8)}, ${person.id}, now() + interval '10 minutes', 'approved')`;

  yield* sql`INSERT INTO auth.verification (identifier, value, expires_at, created_at, updated_at)
    VALUES (${`reset-password:${randomUUID()}`}, ${person.id}, now() + interval '1 hour', now(), now())`;

  yield* sql`INSERT INTO auth.oauth_client (client_id, name, user_id, redirect_uris, created_at, updated_at)
    VALUES (${`synthetic-${randomUUID()}`}, 'Synthetic client of the user', ${person.id}, ARRAY['https://client.example.test/callback'], now(), now())`;

  // What staff did to the user, and what the user did as staff. Entries
  // have UUIDv7 ids.
  yield* sql`INSERT INTO staff.audit_events (id, action, at, reason, staff_id, target_id)
    VALUES (${uuid7()}, 'ban', now(), 'Synthetic reason naming the user', ${randomUUID()}, ${person.id}),
      (${uuid7()}, 'unban', now(), 'Synthetic reason', ${person.id}, ${randomUUID()})`;

  // Changes staff made as the user, in one of their workspaces, and as
  // someone else, removing the user from a workspace.
  yield* sql`INSERT INTO staff.audit_events (id, action, at, staff_id, target_id, workspace_id, operation, object_ids)
    VALUES (${uuid7()}, 'impersonatedChange', now(), ${randomUUID()}, ${person.id}, ${randomUUID()}, 'posts.create', ${JSON.stringify({ postId: randomUUID() })}::jsonb),
      (${uuid7()}, 'impersonatedChange', now(), ${randomUUID()}, ${randomUUID()}, ${randomUUID()}, 'auth:/organization/remove-member', ${JSON.stringify({ memberIdOrEmail: person.id, postId: randomUUID() })}::jsonb)`;

  // A subscription made for the user rather than a workspace, as Better
  // Auth's Stripe plugin would without Peal's guard.
  yield* sql`INSERT INTO auth.subscription (plan, reference_id, status)
    VALUES ('pro', ${person.id}, 'incomplete')`;
});

const countsOf = Effect.fn("countsOf")(function* countsOf(
  rows: Readonly<Record<string, Count>>,
  id: string
) {
  const sql = yield* SqlClient.SqlClient;

  const counted = yield* Effect.all(
    Object.entries(rows).map(([table, rowsOf]) =>
      count(rowsOf(sql, id)).pipe(Effect.map((left) => [table, left] as const))
    )
  );

  return Object.fromEntries(counted);
});

const none = (rows: Readonly<Record<string, Count>>) =>
  Object.fromEntries(Object.keys(rows).map((table) => [table, 0]));

// On a server that keeps what French law has a host keep, so the legal
// records are covered too.
const RetainingLive = Layer.mergeAll(
  TestApp.layerWith({ PEAL_LEGAL_RETENTION: "true" }),
  MigratedSqlLive
);

layer(RetainingLive, {
  excludeTestServices: true,
  timeout: "180 seconds",
})("erasing workspaces and accounts", (it) => {
  it.effect("says what becomes of every table the migrations create", () =>
    Effect.gen(function* everyTable() {
      const sql = yield* SqlClient.SqlClient;

      const tables =
        yield* sql`SELECT table_schema || '.' || table_name AS name FROM information_schema.tables WHERE table_schema IN ${sql.in(schemas)} AND table_type = 'BASE TABLE' ORDER BY 1`.pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(TablesSchema)),
          Effect.orDie
        );

      const accounted = new Set([
        ...Object.keys(workspaceRows),
        ...Object.keys(userRows),
        ...Object.keys(heldRows),
        ...Object.keys(kept),
        ...offboardedRows,
      ]);

      assert.deepStrictEqual(
        tables.map(({ name }) => name),
        [...accounted].toSorted()
      );
    })
  );

  it.effect(
    "leave nothing of a deleted workspace in any table, and nothing of a closed account",
    () =>
      Effect.gen(function* erases() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const ana = yield* signedUp("ana");
        const ben = yield* signedUp("ben");
        const staff = yield* signedUp("cleo");
        const own = yield* workspaceOf(ana, "Alone");
        const shared = yield* workspaceOf(ben, "Together");

        yield* join(ben, shared, ana, "admin");
        // Own last: the session opens it.
        yield* fill(shared, ana);
        yield* fill(own, ana);
        yield* fillPerson(ana);

        // A session staff opened to act as Ben, as the admin plugin does.
        yield* sql`INSERT INTO auth.session (token, user_id, impersonated_by, expires_at, created_at, updated_at)
          VALUES (${randomUUID()}, ${ben.id}, ${staff.id}, now() + interval '1 hour', now(), now())`;

        // Everything was written: a count that stays at zero tests nothing.
        const filled = yield* countsOf(workspaceRows, own);

        for (const [table, rows] of Object.entries(filled)) {
          assert.isAbove(rows, 0, `${table} holds a row of the workspace`);
        }

        const deleted = yield* app.request(`/api/workspaces/${own}`, {
          body: { name: "Alone" },
          headers: { cookie: ana.cookies },
          method: "DELETE",
        });

        assert.strictEqual(deleted.status, 204);
        assert.deepStrictEqual(
          yield* countsOf(workspaceRows, own),
          none(workspaceRows)
        );

        // Ana still has her records in Together: closing the account takes
        // them, and leaves the workspace and its content to Ben.
        const before = yield* countsOf(userRows, ana.id);

        // The audit events about her, by id: once she is gone they name
        // nobody, and other suites' events, which never named anyone, are
        // not hers to count.
        const aboutHer = (yield* sql<{
          readonly id: string;
        }>`SELECT id FROM staff.audit_events WHERE target_id = ${ana.id}`.pipe(
          Effect.orDie
        )).map(({ id }) => id);

        assert.isAbove(aboutHer.length, 0);

        for (const [table, rows] of Object.entries(before)) {
          assert.isAbove(rows, 0, `${table} holds a row of the user`);
        }

        const closed = yield* app.request("/api/me", {
          body: { password },
          headers: { cookie: ana.cookies },
          method: "DELETE",
        });

        assert.strictEqual(closed.status, 204);
        assert.deepStrictEqual(
          yield* countsOf(userRows, ana.id),
          none(userRows)
        );

        // The key she created in the workspace she shared is still in its
        // log, as a change someone made.
        assert.isAbove(
          yield* count(
            sql`SELECT count(*)::int AS count FROM activity.events WHERE workspace_id = ${shared} AND operation = 'apiKeys.create' AND actor_kind = 'user' AND user_id IS NULL AND application_id IS NULL`
          ),
          0
        );

        // Only what the law has a host keep is left, apart: who held the
        // account, once, and the connections that made content.
        assert.deepStrictEqual(yield* countsOf(heldRows, ana.id), {
          "legal.connections": 2,
          "legal.identification_holds": 1,
        });

        const holds =
          yield* sql`SELECT email, sign_in_methods -> 0 ->> 'provider' AS sign_in FROM legal.identification_holds WHERE user_id = ${ana.id}`.pipe(
            Effect.flatMap(
              Schema.decodeUnknownEffect(
                Schema.Array(
                  Schema.Struct({
                    email: Schema.String,
                    sign_in: Schema.String,
                  })
                )
              )
            ),
            Effect.orDie
          );

        assert.deepStrictEqual(holds, [
          {
            email: ana.email,
            sign_in: "credential",
          },
        ]);

        const posts = yield* count(
          sql`SELECT count(*)::int AS count FROM publishing.posts WHERE workspace_id = ${shared} AND author_id IS NULL AND scheduled_by IS NULL AND scheduled_via ->> '_tag' = 'web'`
        );

        assert.strictEqual(posts, 1);

        // The reason staff gave about her went with her id, but a ban's,
        // which stays with a keyed pseudonym of her address instead, so
        // Peal can show a court what it did and why.
        const reasons = yield* count(
          sql`SELECT count(*)::int AS count FROM staff.audit_events WHERE id IN ${sql.in(aboutHer)} AND (target_id IS NOT NULL OR (reason IS NOT NULL AND action NOT IN ('ban', 'unban')))`
        );

        assert.strictEqual(reasons, 0);

        const bans = yield* count(
          sql`SELECT count(*)::int AS count FROM staff.audit_events WHERE target_id IS NULL AND action = 'ban' AND reason = 'Synthetic reason naming the user' AND target_pseudonym IS NOT NULL`
        );

        assert.isAbove(bans, 0);

        // Her trial stays, by the same pseudonym, so her address gets no
        // second one.
        const trials = yield* count(
          sql`SELECT count(*)::int AS count FROM billing.trials WHERE user_id IS NULL AND user_pseudonym IS NOT NULL AND forgotten_at IS NOT NULL`
        );

        assert.isAbove(trials, 0);

        // So did the workspace and the ids of what staff changed as her,
        // which would tie the events back to her.
        const linked = yield* count(
          sql`SELECT count(*)::int AS count FROM staff.audit_events WHERE id IN ${sql.in(aboutHer)} AND (workspace_id IS NOT NULL OR object_ids <> '{}'::jsonb)`
        );

        assert.strictEqual(linked, 0);

        // What she did as staff keeps her id: the server answers for what
        // staff did to other people's accounts, a legitimate interest.
        const actedAsStaff = yield* count(
          sql`SELECT count(*)::int AS count FROM staff.audit_events WHERE staff_id = ${ana.id}`
        );

        assert.strictEqual(actedAsStaff, 1);

        // A staff member closing theirs ends the sessions they act as
        // others in.
        const closedStaff = yield* app.request("/api/me", {
          body: { password },
          headers: { cookie: staff.cookies },
          method: "DELETE",
        });

        assert.strictEqual(closedStaff.status, 204);
        assert.deepStrictEqual(
          yield* countsOf(userRows, staff.id),
          none(userRows)
        );

        // Together goes too, to leave the shared database as it was.
        const together = yield* app.request(`/api/workspaces/${shared}`, {
          body: { name: "Together" },
          headers: { cookie: ben.cookies },
          method: "DELETE",
        });

        assert.strictEqual(together.status, 204);
      })
  );

  it.effect(
    "copy out of every table no secret, and nothing of another member",
    () =>
      Effect.gen(function* exports() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const lee = yield* signedUp("lee");
        const kim = yield* signedUp("kim");
        const own = yield* workspaceOf(lee, "Studio");
        const shared = yield* workspaceOf(kim, "Agency");

        yield* join(kim, shared, lee, "admin");
        yield* fill(shared, lee);
        yield* fill(own, lee);
        yield* fillPerson(lee);
        yield* seedNotice(kim.id, shared, "@kim@social.example");

        const secrets = yield* sql`
          SELECT access_token AS secret FROM channels.channels WHERE workspace_id IN (${own}, ${shared})
          UNION ALL SELECT secret FROM channels.connect_attempts WHERE workspace_id IN (${own}, ${shared})
          UNION ALL SELECT accounts FROM channels.connect_choices WHERE workspace_id IN (${own}, ${shared})
          UNION ALL SELECT key FROM auth.apikey WHERE reference_id IN (${own}, ${shared})
          UNION ALL SELECT token FROM auth.oauth_access_token WHERE user_id = ${lee.id}
          UNION ALL SELECT token FROM auth.oauth_refresh_token WHERE user_id = ${lee.id}
          UNION ALL SELECT token FROM auth.session WHERE user_id = ${lee.id}
          UNION ALL SELECT password FROM auth.account WHERE user_id = ${lee.id} AND password IS NOT NULL
          UNION ALL SELECT split_part(identifier, ':', 2) FROM auth.verification WHERE value = ${lee.id}
          UNION ALL SELECT device_code FROM auth.device_code WHERE user_id = ${lee.id}
          UNION ALL SELECT stripe_customer_id FROM billing.subscriptions WHERE workspace_id = ${own}
          UNION ALL SELECT stripe_subscription_id FROM billing.subscriptions WHERE workspace_id = ${own}`.pipe(
          Effect.flatMap(
            Schema.decodeUnknownEffect(
              Schema.Array(Schema.Struct({ secret: Schema.String }))
            )
          ),
          Effect.orDie
        );

        assert.isAtLeast(secrets.length, 14);

        const reply = yield* app.request("/api/me/export", {
          headers: { cookie: lee.cookies },
        });

        assert.strictEqual(reply.status, 200);

        const text = JSON.stringify(reply.body);

        for (const { secret } of secrets) {
          assert.notInclude(text, secret);
        }

        // Kim's address and notices are Kim's, though Lee works with Kim.
        assert.notInclude(text, kim.email);
        assert.notInclude(text, "@kim@social.example");
        assert.include(text, lee.email);

        for (const [person, workspaceId, name] of [
          [lee, own, "Studio"],
          [kim, shared, "Agency"],
        ] as const) {
          const deleted = yield* app.request(`/api/workspaces/${workspaceId}`, {
            body: { name },
            headers: { cookie: person.cookies },
            method: "DELETE",
          });

          assert.strictEqual(deleted.status, 204);
        }
      })
  );
});
