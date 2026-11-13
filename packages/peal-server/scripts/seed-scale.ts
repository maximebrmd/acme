// Fills an empty, migrated database with synthetic rows at the size of a
// server with many users, to read query plans on (EXPLAIN) and to time the
// jobs that scan every workspace. Nothing here is a real account, post or
// token: ids are random, names are numbered, tokens are the word
// "synthetic".
//
//   DATABASE_URL=postgres://…/peal_scale bun src/migrate.ts
//   DATABASE_URL=postgres://…/peal_scale bun scripts/seed-scale.ts [users] [customers]
//
// Per user (the sizing model's averages): one workspace, 4 channels, 30
// posts a month on 2 or 3 channels each, over three months. Each workspace
// has its owner as a member, one in three an editor too; one in five has
// a subscription (a starter plan, a trial of pro, or one cancelled). The
// first workspace is a partner's home, owning `customers` workspaces
// (1,000 by default) of one channel each and no member, to read the
// plans of the reads across a partner's pool on. The posts of
// the last 30 days are followed by analytics and due at the next
// collection; a day of posts is still scheduled. The first workspace has
// two webhook endpoints and a million deliveries over the 30 days of the
// log, one in twenty failed for good, to read the plans of the log across
// endpoints and of the replay of failed deliveries on. Each workspace has
// 40 files of media, and the first 100,000, to read the library's search
// on. It refuses a database whose name does not end in "scale", and one
// that already holds posts.

import { Option, Schema } from "effect";

import { databaseNameOf } from "#shared/infrastructure/database-name.ts";

const url = process.env["DATABASE_URL"] ?? "";
const users = Number(process.argv[2] ?? "10000");
const customers = Number(process.argv[3] ?? "1000");

// The name in the URL's path, not anywhere in the URL: a parameter such as
// `?application_name=scale` names no database.
if (!Option.exists(databaseNameOf(url), (name) => name.endsWith("scale"))) {
  throw new Error("DATABASE_URL must name a database ending in 'scale'");
}

if (!Number.isInteger(users) || users < 1) {
  throw new Error("The number of users must be a whole number above 0");
}

if (!Number.isInteger(customers) || customers < 0) {
  throw new Error("The number of customers must be a whole number");
}

const sql = new Bun.SQL(url);

const decodeExisting = Schema.decodeUnknownSync(
  Schema.Tuple([Schema.Struct({ name: Schema.String, posts: Schema.Number })])
);

const [existing] = decodeExisting(
  await sql`SELECT current_database() AS name, count(*)::int AS posts FROM publishing.posts`
);

// What the server itself says it is, whatever the URL was read as.
if (!existing.name.endsWith("scale")) {
  throw new Error("The database connected to does not end in 'scale'");
}

if (existing.posts > 0) {
  throw new Error("The database already holds posts");
}

const months = 3;
const postsPerUser = 30 * months;

const timed = async (label: string, run: () => Promise<void>) => {
  const startedAt = performance.now();

  await run();
  console.log(`${label}: ${Math.round(performance.now() - startedAt)} ms`);
};

await sql`CREATE TEMP TABLE seed_workspaces AS
  SELECT gen_random_uuid() AS id, number
  FROM generate_series(1, ${users}) AS number`;

await timed("channels", async () => {
  await sql`
  INSERT INTO channels.channels
    (id, workspace_id, platform, account_id, handle, access_token, refresh_token,
     token_key_id, token_kind, token_expires_at, token_issued_at, scopes, status,
     refresh_needed, created_at, updated_at)
  SELECT uuidv7(), workspace.id, platform.name,
         'synthetic-' || workspace.number || '-' || platform.slot,
         '@synthetic_' || workspace.number || '_' || platform.slot,
         'k1.synthetic.synthetic',
         CASE WHEN platform.kind = 'refreshable' THEN 'k1.synthetic.synthetic' END,
         'k1', platform.kind,
         CASE platform.kind
           WHEN 'refreshable' THEN now() + (random() * 60 - 40) * interval '1 day'
           WHEN 'nonRefreshable' THEN now() + random() * 60 * interval '1 day'
         END,
         CASE WHEN platform.kind = 'nonRefreshable' THEN now() - interval '1 day' END,
         ARRAY['synthetic'], 'active', false, now() - interval '100 days', now() - random() * interval '30 days'
  FROM seed_workspaces AS workspace
  CROSS JOIN LATERAL (
    SELECT slot,
           (ARRAY['mastodon','bluesky','linkedin','x','threads','instagram','facebook','tiktok','youtube'])[1 + (workspace.number + slot) % 9] AS name,
           (ARRAY['nonExpiring','refreshable','nonRefreshable','refreshable','refreshable','nonExpiring','nonExpiring','refreshable','refreshable'])[1 + (workspace.number + slot) % 9] AS kind
    FROM generate_series(1, 4) AS slot
  ) AS platform`;
});

// The sign-in service's rows: each workspace, its owner, one in three an
// editor more, and a subscription for one in five.
await timed("accounts", async () => {
  await sql`
  INSERT INTO auth.organization (id, name, slug, created_at)
  SELECT id, 'Synthetic workspace ' || number, 'synthetic-' || number,
         now() - interval '100 days'
  FROM seed_workspaces`;

  await sql`
  CREATE TEMP TABLE seed_members AS
  SELECT gen_random_uuid() AS user_id, workspace.id AS workspace_id,
         workspace.number, seat
  FROM seed_workspaces AS workspace
  CROSS JOIN generate_series(1, 2) AS seat
  WHERE seat = 1 OR workspace.number % 3 = 0`;

  await sql`
  INSERT INTO auth.user (id, name, email, created_at, updated_at)
  SELECT user_id, 'Synthetic member ' || number || '-' || seat,
         'synthetic-' || number || '-' || seat || '@example.com',
         now() - interval '100 days', now() - interval '100 days'
  FROM seed_members`;

  await sql`
  INSERT INTO auth.member (organization_id, user_id, role, created_at)
  SELECT workspace_id, user_id, CASE WHEN seat = 1 THEN 'owner' ELSE 'editor' END,
         now() - interval '100 days'
  FROM seed_members`;

  await sql`
  INSERT INTO billing.subscriptions
    (stripe_subscription_id, stripe_customer_id, workspace_id, plan, status,
     interval, cancel_at_period_end, last_event_at, last_event_id, updated_at)
  SELECT 'sub_synthetic_' || number, 'cus_synthetic_' || number, id,
         (ARRAY['starter','pro','starter'])[1 + (number / 5) % 3],
         (ARRAY['active','trialing','canceled'])[1 + (number / 5) % 3],
         'month', false, now() - interval '10 days',
         'evt_synthetic_' || number, now() - interval '10 days'
  FROM seed_workspaces
  WHERE number % 5 = 0`;
});

// A partner whose home is the first workspace, and its customers: one
// channel each, one in ten to reconnect, and no member.
await timed("partner", async () => {
  await sql`
  CREATE TEMP TABLE seed_customers AS
  SELECT gen_random_uuid() AS id, number
  FROM generate_series(1, ${customers}) AS number`;

  await sql`
  INSERT INTO workspace.partners (id, workspace_id, name, return_origins, created_at, updated_at)
  SELECT uuidv7(), id, 'Synthetic partner', '{}', now() - interval '100 days', now() - interval '100 days'
  FROM seed_workspaces
  WHERE number = 1`;

  await sql`
  INSERT INTO auth.organization (id, name, slug, created_at)
  SELECT id, 'Synthetic customer ' || number, id::text,
         now() - interval '90 days' + number * interval '1 minute'
  FROM seed_customers`;

  await sql`
  INSERT INTO workspace.partner_workspaces (workspace_id, partner_id, external_id, created_at)
  SELECT customer.id, partner.id, 'synthetic-' || customer.number,
         now() - interval '90 days' + customer.number * interval '1 minute'
  FROM seed_customers AS customer
  CROSS JOIN workspace.partners AS partner`;

  await sql`
  INSERT INTO channels.channels
    (id, workspace_id, platform, account_id, handle, access_token,
     token_key_id, token_kind, scopes, status, refresh_needed, created_at, updated_at)
  SELECT uuidv7(), id, 'mastodon', 'synthetic-customer-' || number,
         '@synthetic_customer_' || number, 'k1.synthetic.synthetic', 'k1',
         'nonExpiring', ARRAY['synthetic'],
         CASE WHEN number % 10 = 0 THEN 'refreshNeeded' ELSE 'active' END,
         number % 10 = 0,
         now() - interval '90 days', now() - interval '90 days'
  FROM seed_customers`;
});

// Posts spread evenly over the months before now and a day after it: those
// past are finished, those to come scheduled.
await timed("posts", async () => {
  await sql`
  INSERT INTO publishing.posts
    (id, workspace_id, status, outcome, text, schedule_zone, scheduled_at,
     started_at, finished_at)
  SELECT uuidv7(), workspace.id,
         CASE WHEN at.scheduled > now() THEN 'scheduled' ELSE 'finished' END,
         CASE WHEN at.scheduled > now() THEN NULL ELSE 'published' END,
         'Synthetic post ' || post, 'Europe/Paris', at.scheduled,
         CASE WHEN at.scheduled <= now() THEN at.scheduled END,
         CASE WHEN at.scheduled <= now() THEN at.scheduled + interval '5 seconds' END
  FROM seed_workspaces AS workspace
  CROSS JOIN generate_series(1, ${postsPerUser}) AS post
  CROSS JOIN LATERAL (
    SELECT now() + interval '1 day'
           - (post + random()) * (interval '1 day' * ${months * 30 + 1} / ${postsPerUser}) AS scheduled
  ) AS at`;
});

// Two or three targets a post, on the workspace's channels.
await timed("targets", async () => {
  await sql`
  INSERT INTO publishing.post_targets
    (id, post_id, channel_id, status, started_at, finished_at, platform_post_id, permalink)
  SELECT uuidv7(), post.id, channel.id,
         CASE WHEN post.status = 'finished' THEN 'published' ELSE 'pending' END,
         post.started_at, post.finished_at,
         CASE WHEN post.status = 'finished' THEN '11' || lpad((random() * 1e15)::bigint::text, 16, '0') END,
         CASE WHEN post.status = 'finished' THEN 'https://social.example/@synthetic/1' END
  FROM publishing.posts AS post
  CROSS JOIN LATERAL (
    SELECT id FROM (
      SELECT id, row_number() OVER (ORDER BY id) AS slot
      FROM channels.channels
      WHERE workspace_id = post.workspace_id
    ) AS numbered
    WHERE slot <= 2 + (get_byte(uuid_send(post.id), 15) % 2)
  ) AS channel`;
});

// Analytics follows what went live: read hourly for two days, daily until
// day 30 (due at the next run), no more after.
await timed("tracked posts", async () => {
  await sql`
  INSERT INTO analytics.tracked_posts
    (target_id, post_id, workspace_id, channel_id, platform_post_id,
     published_at, last_collected_at, likes, reposts, replies,
     next_collection_at, ended_at, end_reason)
  SELECT target.id, post.id, post.workspace_id, target.channel_id,
         target.platform_post_id, target.finished_at, now() - interval '1 hour',
         3, 1, 0,
         CASE
           WHEN target.finished_at > now() - interval '2 days'
             THEN date_trunc('hour', now()) + interval '7 minutes'
           WHEN target.finished_at > now() - interval '30 days'
             THEN date_trunc('hour', now()) + interval '7 minutes'
                  + (get_byte(uuid_send(target.id), 15) % 24) * interval '1 hour'
         END,
         CASE WHEN target.finished_at <= now() - interval '30 days' THEN target.finished_at + interval '30 days' END,
         CASE WHEN target.finished_at <= now() - interval '30 days' THEN 'window' END
  FROM publishing.post_targets AS target
  JOIN publishing.posts AS post ON post.id = target.post_id
  WHERE target.status = 'published'`;
});

// A busy workspace's webhooks: two endpoints, a million events, each
// delivered once, spread over the log's 30 days.
const deliveriesOfBusiest = 1_000_000;

await timed("webhook deliveries", async () => {
  await sql`
  INSERT INTO webhooks.endpoints
    (id, workspace_id, url, description, event_types, secret, status,
     created_at, updated_at)
  SELECT uuidv7(), workspace.id, 'https://hooks.example.com/synthetic-' || slot,
         '', ARRAY['post.published', 'post.failed'], 'k1.synthetic.synthetic',
         'enabled', now() - interval '40 days', now() - interval '40 days'
  FROM seed_workspaces AS workspace
  CROSS JOIN generate_series(1, 2) AS slot
  WHERE workspace.number = 1`;

  await sql`
  CREATE TEMP TABLE seed_events AS
  SELECT uuidv7() AS id, n,
         now() - ((${deliveriesOfBusiest} - n)::double precision / ${deliveriesOfBusiest}) * interval '30 days' AS at
  FROM generate_series(1, ${deliveriesOfBusiest}) AS n`;

  await sql`
  INSERT INTO webhooks.events (id, workspace_id, key, type, data, occurred_at)
  SELECT event.id, workspace.id, 'synthetic:' || event.n, 'post.published',
         '{}'::jsonb, event.at
  FROM seed_events AS event
  CROSS JOIN seed_workspaces AS workspace
  WHERE workspace.number = 1`;

  await sql`
  INSERT INTO webhooks.deliveries
    (id, endpoint_id, event_id, event_type, workspace_id, status,
     failure_reason, attempts, created_at, completed_at)
  SELECT uuidv7(), endpoint.id, event.id, 'post.published',
         endpoint.workspace_id,
         CASE WHEN event.n % 20 = 0 THEN 'failed' ELSE 'succeeded' END,
         CASE WHEN event.n % 20 = 0 THEN 'exhausted' END,
         CASE WHEN event.n % 20 = 0 THEN 8 ELSE 1 END,
         event.at, event.at + interval '1 second'
  FROM seed_events AS event
  JOIN (
    SELECT id, workspace_id, row_number() OVER (ORDER BY id) - 1 AS slot
    FROM webhooks.endpoints
  ) AS endpoint ON endpoint.slot = event.n % 2
  ORDER BY event.n`;
});

// Each workspace's library: 40 files, and the first workspace's 100,000,
// to read the plans of the library's search and filters on. Four in five
// are images, three in twenty videos, one in twenty documents; one in two
// has a description, one in ten no name (a file added before names were
// kept, or one the assistant made), and one in ten thousand of the first
// workspace's is a "launch" file, for a search that finds almost nothing.
const mediaOfBusiest = 100_000;

await timed("media", async () => {
  await sql`
  INSERT INTO media.media_assets
    (id, workspace_id, status, content_type, byte_size, storage_key,
     file_name, alt_text, width, height, created_at, updated_at)
  SELECT file.id, file.workspace_id, 'ready', file.content_type,
         100000 + file.n, 'media/' || file.workspace_id || '/' || file.id,
         CASE
           WHEN file.n % 10 = 0 THEN NULL
           WHEN file.workspace_number = 1 AND file.n % 10000 = 1
             THEN 'Synthetic launch ' || file.n || '.' || file.extension
           ELSE 'synthetic-' || file.n || '.' || file.extension
         END,
         CASE WHEN file.n % 2 = 0 THEN 'Synthetic description ' || file.n END,
         CASE WHEN file.content_type LIKE 'image/%' THEN 1080 END,
         CASE WHEN file.content_type LIKE 'image/%' THEN 1080 END,
         now() - interval '100 days', now() - interval '100 days'
  FROM (
    SELECT uuidv7() AS id, shuffled.*
    FROM (
      SELECT workspace.id AS workspace_id,
             workspace.number AS workspace_number, n,
             CASE WHEN n % 20 = 0 THEN 'application/pdf'
                  WHEN n % 20 < 4 THEN 'video/mp4'
                  ELSE 'image/jpeg' END AS content_type,
             CASE WHEN n % 20 = 0 THEN 'pdf'
                  WHEN n % 20 < 4 THEN 'mp4'
                  ELSE 'jpg' END AS extension
      FROM seed_workspaces AS workspace
      CROSS JOIN LATERAL generate_series(
        1, CASE WHEN workspace.number = 1 THEN ${mediaOfBusiest} ELSE 40 END
      ) AS n
      -- Uploads of every workspace come in turn, as they do over time:
      -- ids are UUIDv7s, so their order is the order of upload.
      ORDER BY random()
    ) AS shuffled
  ) AS file`;
});

await timed("analyze", async () => {
  await sql`ANALYZE`;
});

const decodeCounts = Schema.decodeUnknownSync(
  Schema.Tuple([
    Schema.Struct({
      channels: Schema.Number,
      collecting: Schema.Number,
      media: Schema.Number,
      posts: Schema.Number,
      size: Schema.String,
      targets: Schema.Number,
      tracked: Schema.Number,
    }),
  ])
);

const [counts] = decodeCounts(
  await sql`
  SELECT (SELECT count(*) FROM channels.channels)::int AS channels,
         (SELECT count(*) FROM publishing.posts)::int AS posts,
         (SELECT count(*) FROM publishing.post_targets)::int AS targets,
         (SELECT count(*) FROM analytics.tracked_posts)::int AS tracked,
         (SELECT count(*) FROM media.media_assets)::int AS media,
         (SELECT count(*) FROM analytics.tracked_posts WHERE next_collection_at IS NOT NULL)::int AS collecting,
         pg_size_pretty(pg_database_size(current_database())) AS size`
);

console.log(counts);

await sql.close();
